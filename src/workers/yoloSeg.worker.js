import * as ort from "onnxruntime-web";
import { normalizedByteToFloat16, tensorDataToFloat32 } from "../lib/float16.js";

const COCO_CLASS_NAMES = [
  "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat",
  "traffic light","fire hydrant","stop sign","parking meter","bench","bird","cat",
  "dog","horse","sheep","cow","elephant","bear","zebra","giraffe","backpack",
  "umbrella","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball",
  "kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket",
  "bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
  "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake",
  "chair","couch","potted plant","bed","dining table","toilet","tv","laptop",
  "mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink",
  "refrigerator","book","clock","vase","scissors","teddy bear","hair drier","toothbrush",
];

function getClassNames(classCount) {
  if (classCount === COCO_CLASS_NAMES.length) return COCO_CLASS_NAMES;
  return Array.from({ length: classCount }, (_, i) => i === 0 ? "object" : `class ${i}`);
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function classColor(classId) {
  const hue = (classId * 137.508) % 360;
  return hslToRgb(hue, 75, 55);
}

function getInputSize(modelName) {
  return modelName === "yolov8m-seg-half.onnx" ? 640 : 960;
}

let session = null;
let sessionPromise = null;
let currentModelName = null;

function post(id, payload) {
  self.postMessage({ id, ...payload });
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

function imageToTensor(bitmap, inputSize) {
  const letterbox = getLetterbox(bitmap.width, bitmap.height, inputSize);
  const canvas = new OffscreenCanvas(inputSize, inputSize);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.fillStyle = "rgb(114, 114, 114)";
  ctx.fillRect(0, 0, inputSize, inputSize);
  ctx.drawImage(bitmap, letterbox.padX, letterbox.padY, letterbox.newW, letterbox.newH);

  const imageData = ctx.getImageData(0, 0, inputSize, inputSize).data;
  const tensorData = new Uint16Array(1 * 3 * inputSize * inputSize);
  const area = inputSize * inputSize;

  for (let index = 0; index < area; index += 1) {
    tensorData[index] = normalizedByteToFloat16(imageData[index * 4]);
    tensorData[area + index] = normalizedByteToFloat16(imageData[index * 4 + 1]);
    tensorData[area * 2 + index] = normalizedByteToFloat16(imageData[index * 4 + 2]);
  }

  return {
    tensor: new ort.Tensor("float16", tensorData, [1, 3, inputSize, inputSize]),
    letterbox,
  };
}

function parseDetections(output, imgW, imgH, letterbox, settings) {
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

    const prob = sigmoid(bestScore);
    if (prob < settings.confidenceThreshold) continue;

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
      score: prob,
      classId: bestClass,
      maskCoeff,
    });
  }

  return nms(detections, settings.iouThreshold);
}

function findProtoOutput(outputs) {
  return Object.values(outputs).find((tensor) => tensor.dims.length === 4 && tensor.dims[1] === 32);
}

function drawMask(ctx, detection, protoData, protoDims, imgW, imgH, letterbox, maskThreshold, inputSize, color) {
  if (!protoData || !protoDims) return;

  const [, maskDim, protoH, protoW] = protoDims;
  const x1 = Math.floor(detection.x1);
  const y1 = Math.floor(detection.y1);
  const x2 = Math.ceil(detection.x2);
  const y2 = Math.ceil(detection.y2);
  const maskCanvas = new OffscreenCanvas(imgW, imgH);
  const maskCtx = maskCanvas.getContext("2d");
  const maskImage = maskCtx.createImageData(imgW, imgH);

  for (let y = y1; y < y2; y += 1) {
    for (let x = x1; x < x2; x += 1) {
      const modelX = x * letterbox.scale + letterbox.padX;
      const modelY = y * letterbox.scale + letterbox.padY;
      const px = clamp(Math.floor((modelX / inputSize) * protoW), 0, protoW - 1);
      const py = clamp(Math.floor((modelY / inputSize) * protoH), 0, protoH - 1);
      let value = 0;
      const base = py * protoW + px;

      for (let index = 0; index < maskDim; index += 1) {
        value += detection.maskCoeff[index] * protoData[index * protoW * protoH + base];
      }

      if (sigmoid(value) > maskThreshold) {
        const imageIndex = (y * imgW + x) * 4;
        maskImage.data[imageIndex]     = color[0];
        maskImage.data[imageIndex + 1] = color[1];
        maskImage.data[imageIndex + 2] = color[2];
        maskImage.data[imageIndex + 3] = 118;
      }
    }
  }

  maskCtx.putImageData(maskImage, 0, 0);
  ctx.drawImage(maskCanvas, 0, 0);
}

function drawResult(bitmap, detections, proto, letterbox, settings, inputSize, classNames) {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  const protoData = proto ? tensorDataToFloat32(proto) : null;
  const protoDims = proto?.dims;

  ctx.drawImage(bitmap, 0, 0);

  for (const detection of detections) {
    const color = classColor(detection.classId);
    drawMask(ctx, detection, protoData, protoDims, bitmap.width, bitmap.height, letterbox, settings.maskThreshold || 0.5, inputSize, color);
  }

  for (const detection of detections) {
    const name = classNames[detection.classId] ?? `class ${detection.classId}`;
    const label = `${name} ${(detection.score * 100).toFixed(1)}%`;
    const color = classColor(detection.classId);
    const colorStr = `rgb(${color[0]},${color[1]},${color[2]})`;
    const boxW = detection.x2 - detection.x1;
    const boxH = detection.y2 - detection.y1;
    const textH = Math.max(24, bitmap.width / 34);
    const labelY = Math.max(0, detection.y1 - textH);

    ctx.lineWidth = Math.max(2, bitmap.width / 420);
    ctx.strokeStyle = colorStr;
    ctx.fillStyle = colorStr;
    ctx.strokeRect(detection.x1, detection.y1, boxW, boxH);

    ctx.font = `600 ${Math.max(14, bitmap.width / 48)}px Inter, Arial, sans-serif`;
    ctx.fillRect(detection.x1, labelY, ctx.measureText(label).width + 14, textH);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, detection.x1 + 7, labelY + textH - 7);
  }

  return canvas.transferToImageBitmap();
}

function validatePrimaryOutput(output) {
  if (!output) throw new Error("모델의 기본 output을 찾을 수 없습니다.");
  if (output.dims.length !== 3 || output.dims[0] !== 1) {
    throw new Error(`예상 output shape는 [1, channels, anchors]인데 실제는 [${output.dims.join(", ")}]입니다.`);
  }
  const classCount = output.dims[1] - 4 - 32;
  if (classCount < 1) {
    throw new Error(`output channels(${output.dims[1]})가 너무 작습니다. 최소 37 (4+1+32)이어야 합니다.`);
  }
}

async function loadModel(id, modelName = "yolov8-seg-half.onnx") {
  const targetUrl = `${import.meta.env.BASE_URL}models/${modelName}`;

  if (session && currentModelName === modelName) {
    if (id !== undefined) post(id, { type: "loaded" });
    return;
  }

  if (sessionPromise && currentModelName === modelName) {
    await sessionPromise;
    if (id !== undefined) post(id, { type: "loaded" });
    return;
  }

  // 이전 모델 로딩이 진행 중이라면 완료될 때까지 기다립니다.
  if (sessionPromise) {
    try { await sessionPromise; } catch (e) {}
  }

  session = null;
  currentModelName = modelName;

  sessionPromise = (async () => {
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
    session = await ort.InferenceSession.create(targetUrl, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  })();

  try {
    await sessionPromise;
  } catch (err) {
    sessionPromise = null;
    currentModelName = null;
    throw err;
  } finally {
    sessionPromise = null;
  }

  if (id !== undefined) post(id, { type: "loaded" });
}

async function runImage(id, bitmap, settings, modelName = "yolov8-seg-half.onnx") {
  if (!session || currentModelName !== modelName) {
    if (sessionPromise && currentModelName === modelName) {
      await sessionPromise;
    } else {
      await loadModel(undefined, modelName);
    }
  }

  const inputSize = getInputSize(modelName);

  try {
    const { tensor, letterbox } = imageToTensor(bitmap, inputSize);
    const inputName = session.inputNames[0];
    const startedAt = performance.now();
    const outputs = await session.run({ [inputName]: tensor });
    const elapsed = performance.now() - startedAt;
    const output = outputs[session.outputNames[0]];

    validatePrimaryOutput(output);

    const proto = findProtoOutput(outputs);
    const classCount = output.dims[1] - 4 - 32;
    const classNames = getClassNames(classCount);
    const detections = parseDetections(output, bitmap.width, bitmap.height, letterbox, settings);
    const resultBitmap = drawResult(bitmap, detections, proto, letterbox, settings, inputSize, classNames);

    bitmap.close();

    self.postMessage(
      {
        id,
        type: "result",
        result: {
          detections,
          elapsed,
          bitmap: resultBitmap,
          imageSize: `${resultBitmap.width} x ${resultBitmap.height}`,
          protoShape: proto ? proto.dims.join(" x ") : "없음",
        },
      },
      [resultBitmap]
    );
  } catch (err) {
    if (bitmap) bitmap.close();
    throw err;
  }
}

self.onmessage = async (event) => {
  const { id, type, file, bitmap, settings, modelName } = event.data;

  try {
    if (type === "load") {
      await loadModel(id, modelName);
      return;
    }

    if (type === "run") {
      // bitmap이 없으면 file로부터 새로 생성 (안정성 폴백)
      let targetBitmap = bitmap;
      if (!targetBitmap && file) {
        targetBitmap = await createImageBitmap(file);
      }
      
      if (!targetBitmap) throw new Error("분석할 이미지가 없습니다.");
      
      await runImage(id, targetBitmap, settings, modelName);
    }
  } catch (error) {
    post(id, {
      type: "error",
      message: error.message,
    });
  }
};
