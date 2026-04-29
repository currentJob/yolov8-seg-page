import * as ort from "onnxruntime-web";
import { normalizedByteToFloat16, tensorDataToFloat32 } from "./float16.js";

export const MODEL_URL = `${import.meta.env.BASE_URL}models/yolov8-seg-half.onnx`;
export const INPUT_SIZE = 960;
export const CLASS_NAMES = ["object"];

export const DEFAULT_SETTINGS = {
  confidence: 0.35,
  iou: 0.45,
  mask: 0.5,
};

export function configureRuntime() {
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
}

export async function createYoloSession() {
  configureRuntime();

  return ort.InferenceSession.create(MODEL_URL, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calcIoU(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);

  return intersection / (areaA + areaB - intersection + 1e-6);
}

function nms(detections, threshold) {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const selected = [];

  while (sorted.length > 0) {
    const best = sorted.shift();
    selected.push(best);

    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      if (calcIoU(best, sorted[index]) > threshold) {
        sorted.splice(index, 1);
      }
    }
  }

  return selected;
}

function getLetterbox(srcW, srcH, size) {
  const scale = Math.min(size / srcW, size / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);
  const padX = Math.floor((size - newW) / 2);
  const padY = Math.floor((size - newH) / 2);

  return { scale, newW, newH, padX, padY };
}

export async function loadImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;

  try {
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function imageToTensor(img) {
  const letterbox = getLetterbox(img.width, img.height, INPUT_SIZE);
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "rgb(114, 114, 114)";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(img, letterbox.padX, letterbox.padY, letterbox.newW, letterbox.newH);

  const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const tensorData = new Uint16Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);
  const area = INPUT_SIZE * INPUT_SIZE;

  for (let index = 0; index < area; index += 1) {
    tensorData[index] = normalizedByteToFloat16(imageData[index * 4]);
    tensorData[area + index] = normalizedByteToFloat16(imageData[index * 4 + 1]);
    tensorData[area * 2 + index] = normalizedByteToFloat16(imageData[index * 4 + 2]);
  }

  return {
    tensor: new ort.Tensor("float16", tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]),
    letterbox,
  };
}

export function parseDetections(output, imgW, imgH, letterbox, settings) {
  const data = tensorDataToFloat32(output);
  const [, channels, anchors] = output.dims;
  const classCount = channels - 4 - 32;
  const detections = [];

  for (let index = 0; index < anchors; index += 1) {
    const cx = data[index];
    const cy = data[anchors + index];
    const width = data[anchors * 2 + index];
    const height = data[anchors * 3 + index];

    let bestClass = 0;
    let bestScore = -Infinity;

    for (let classIndex = 0; classIndex < classCount; classIndex += 1) {
      const score = data[(4 + classIndex) * anchors + index];

      if (score > bestScore) {
        bestScore = score;
        bestClass = classIndex;
      }
    }

    if (bestScore < settings.confidence) continue;

    const x1Model = cx - width / 2;
    const y1Model = cy - height / 2;
    const x2Model = cx + width / 2;
    const y2Model = cy + height / 2;

    const x1 = clamp((x1Model - letterbox.padX) / letterbox.scale, 0, imgW);
    const y1 = clamp((y1Model - letterbox.padY) / letterbox.scale, 0, imgH);
    const x2 = clamp((x2Model - letterbox.padX) / letterbox.scale, 0, imgW);
    const y2 = clamp((y2Model - letterbox.padY) / letterbox.scale, 0, imgH);
    const maskCoeff = [];

    for (let maskIndex = 0; maskIndex < 32; maskIndex += 1) {
      maskCoeff.push(data[(4 + classCount + maskIndex) * anchors + index]);
    }

    detections.push({
      id: `${bestClass}-${Math.round(x1)}-${Math.round(y1)}-${index}`,
      x1,
      y1,
      x2,
      y2,
      score: bestScore,
      classId: bestClass,
      maskCoeff,
    });
  }

  return nms(detections, settings.iou);
}

export function findProtoOutput(outputs) {
  return Object.values(outputs).find((tensor) => tensor.dims.length === 4 && tensor.dims[1] === 32);
}

function drawMask(ctx, detection, protoData, protoDims, imgW, imgH, letterbox, maskThreshold) {
  if (!protoData || !protoDims) return;

  const [, maskDim, protoH, protoW] = protoDims;
  const x1 = Math.floor(detection.x1);
  const y1 = Math.floor(detection.y1);
  const x2 = Math.ceil(detection.x2);
  const y2 = Math.ceil(detection.y2);
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = imgW;
  maskCanvas.height = imgH;

  const maskCtx = maskCanvas.getContext("2d");
  const maskImage = maskCtx.createImageData(imgW, imgH);

  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) {
      const modelX = x * letterbox.scale + letterbox.padX;
      const modelY = y * letterbox.scale + letterbox.padY;
      const px = clamp(Math.floor((modelX / INPUT_SIZE) * protoW), 0, protoW - 1);
      const py = clamp(Math.floor((modelY / INPUT_SIZE) * protoH), 0, protoH - 1);

      let value = 0;
      const base = py * protoW + px;

      for (let index = 0; index < maskDim; index += 1) {
        value += detection.maskCoeff[index] * protoData[index * protoW * protoH + base];
      }

      if (sigmoid(value) > maskThreshold) {
        const imageIndex = (y * imgW + x) * 4;
        maskImage.data[imageIndex] = 14;
        maskImage.data[imageIndex + 1] = 165;
        maskImage.data[imageIndex + 2] = 233;
        maskImage.data[imageIndex + 3] = 118;
      }
    }
  }

  maskCtx.putImageData(maskImage, 0, 0);
  ctx.drawImage(maskCanvas, 0, 0);
}

export function drawResult(canvas, img, detections, proto, letterbox, settings) {
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");
  const protoData = proto ? tensorDataToFloat32(proto) : null;
  const protoDims = proto?.dims;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  for (const detection of detections) {
    drawMask(ctx, detection, protoData, protoDims, img.width, img.height, letterbox, settings.mask);
  }

  for (const detection of detections) {
    const label = `${CLASS_NAMES[detection.classId] ?? `class ${detection.classId}`} ${(
      detection.score * 100
    ).toFixed(1)}%`;
    const boxW = detection.x2 - detection.x1;
    const boxH = detection.y2 - detection.y1;

    ctx.lineWidth = Math.max(2, img.width / 420);
    ctx.strokeStyle = "#0ea5e9";
    ctx.fillStyle = "#0ea5e9";
    ctx.strokeRect(detection.x1, detection.y1, boxW, boxH);

    ctx.font = `600 ${Math.max(14, img.width / 48)}px Inter, Arial, sans-serif`;
    const textW = ctx.measureText(label).width;
    const textH = Math.max(24, img.width / 34);
    const labelY = Math.max(0, detection.y1 - textH);

    ctx.fillRect(detection.x1, labelY, textW + 14, textH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, detection.x1 + 7, labelY + textH - 7);
  }
}

export function validatePrimaryOutput(output) {
  if (!output) {
    throw new Error("모델의 기본 output을 찾을 수 없습니다.");
  }

  if (output.dims[1] !== 37) {
    throw new Error(`예상 output은 [1, 37, anchors]인데 실제는 [${output.dims.join(", ")}]입니다.`);
  }
}
