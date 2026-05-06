import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { MODEL_URL } from "../lib/yoloSeg";

const initialRuntime = {
  phase: "idle",
  message: "모델을 로드하면 브라우저에서 바로 이미지를 분석할 수 있습니다.",
  elapsed: null,
  timings: null,
  protoShape: null,
  imageName: null,
  imageSize: null,
  ep: null,
};

function createWorker() {
  return new Worker(new URL("../workers/yoloSeg.worker.js", import.meta.url), {
    type: "module",
  });
}

export function useYoloSeg(canvasRef, settings, modelName = "yolov8-seg-half.onnx", preferredEp = "auto") {
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastFileRef = useRef(null);
  const pendingBitmapRef = useRef(null);
  const [runtime, setRuntime] = useState(initialRuntime);
  const [detections, setDetections] = useState([]);
  const [hasImage, setHasImage] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [originalBitmap, setOriginalBitmap] = useState(null);

  const isReady = runtime.phase === "ready" || runtime.phase === "done";
  const isBusy = runtime.phase === "loading" || runtime.phase === "running" || isPending;

  const stats = useMemo(() => {
    const avgScore =
      detections.length === 0
        ? 0
        : detections.reduce((sum, detection) => sum + detection.score, 0) / detections.length;

    return {
      count: detections.length,
      avgScore,
      bestScore: detections[0]?.score ?? 0,
    };
  }, [detections]);

  useEffect(() => {
    const worker = createWorker();
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { id, type, message, result } = event.data;

      if (id !== requestIdRef.current && type !== "loaded") return;

      if (type === "loaded") {
        setRuntime((current) => ({
          ...current,
          phase: "ready",
          ep: event.data.ep ?? current.ep,
          message: "모델 로드 완료. 이미지를 업로드하거나 드래그하세요.",
        }));
        return;
      }

      if (type === "result") {
        const canvas = canvasRef.current;

        if (canvas) {
          canvas.width = result.bitmap.width;
          canvas.height = result.bitmap.height;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(result.bitmap, 0, 0);
          result.bitmap.close();
        } else {
          // 캔버스가 아직 마운트되지 않은 경우 (첫 이미지) 비트맵을 보관
          if (pendingBitmapRef.current) pendingBitmapRef.current.close();
          pendingBitmapRef.current = result.bitmap;
        }

        startTransition(() => {
          setHasImage(true);
          setDetections(result.detections);
          setRuntime((current) => ({
            ...current,
            phase: "done",
            elapsed: result.elapsed,
            timings: result.timings ?? null,
            protoShape: result.protoShape,
            imageSize: result.imageSize,
            ep: result.ep ?? current.ep,
            message: `${result.detections.length}개 객체를 감지했습니다.`,
          }));
        });
        return;
      }

      if (type === "error") {
        setRuntime((current) => ({
          ...current,
          phase: "error",
          message: `작업 실패: ${message}`,
        }));
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [canvasRef]);

  // 캔버스가 마운트된 직후 보류 중인 비트맵을 그린다
  useLayoutEffect(() => {
    if (!hasImage || !canvasRef.current || !pendingBitmapRef.current) return;

    const canvas = canvasRef.current;
    const bitmap = pendingBitmapRef.current;
    pendingBitmapRef.current = null;

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
  }, [hasImage, canvasRef]);

  const postWorkerMessage = useCallback((message) => {
    const worker = workerRef.current;
    if (!worker) return null;

    requestIdRef.current += 1;
    const id = requestIdRef.current;
    worker.postMessage({ id, ...message });

    return id;
  }, []);

  const loadModel = useCallback(async () => {
    setRuntime((current) => ({
      ...current,
      phase: "loading",
      message: `Worker에서 ${modelName} 모델과 WASM 런타임을 준비하는 중입니다.`,
    }));

    postWorkerMessage({ type: "load", modelName, preferredEp });
  }, [postWorkerMessage, modelName, preferredEp]);

  const runImage = useCallback(
    async (file) => {
      if (!file) return;

      lastFileRef.current = file;
      setDetections([]);

      const needsLoad = runtime.phase === "idle" || runtime.phase === "error";

      setRuntime((current) => ({
        ...current,
        phase: needsLoad ? "loading" : "running",
        elapsed: null,
        protoShape: null,
        imageName: file.name,
        imageSize: null,
        message: needsLoad
          ? "모델을 로드한 뒤 분석을 시작합니다. 잠시만 기다려주세요."
          : "이미지를 분석하고 있습니다. 잠시만 기다려주세요.",
      }));

      // 원본 비트맵 저장 (메인 스레드용)
      const bitmap = await createImageBitmap(file);
      setOriginalBitmap(bitmap);

      // 이미지를 즉시 캔버스에 표시하여 로딩 오버레이가 이미지 위에 나타나도록 함
      const canvas = canvasRef.current;
      if (canvas) {
        // 캔버스가 이미 마운트된 경우 (이전 이미지가 있을 때) 직접 그린다
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0);
        setHasImage(true);
      } else {
        // 첫 이미지: 캔버스가 아직 마운트되지 않은 경우
        // originalBitmap과 별도로 pendingBitmapRef용 비트맵을 생성 (useLayoutEffect에서 close되므로)
        const previewBitmap = await createImageBitmap(file);
        if (pendingBitmapRef.current) pendingBitmapRef.current.close();
        pendingBitmapRef.current = previewBitmap;
        setHasImage(true);
      }

      if (needsLoad) {
        postWorkerMessage({ type: "load", modelName, preferredEp });
      }

      const worker = workerRef.current;
      if (worker) {
        requestIdRef.current += 1;
        const id = requestIdRef.current;

        worker.postMessage({
          id,
          type: "run",
          file,
          settings,
          modelName,
          preferredEp,
        });
      }
    },
    [postWorkerMessage, settings, runtime.phase, modelName, preferredEp, canvasRef]
  );

  const rerunLastImage = useCallback(() => {
    if (lastFileRef.current) {
      runImage(lastFileRef.current);
    }
  }, [runImage]);

  const clearResult = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    setDetections([]);
    setHasImage(false);
    setOriginalBitmap(null);
    setRuntime((current) => ({
      ...current,
      phase: isReady ? "ready" : "idle",
      elapsed: null,
      protoShape: null,
      imageName: null,
      imageSize: null,
      message: isReady
        ? "결과를 비웠습니다. 새 이미지를 업로드하세요."
        : "모델을 로드하면 브라우저에서 바로 이미지를 분석할 수 있습니다.",
    }));
  }, [canvasRef, isReady]);

  const downloadResult = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "yolo-seg-result.png";
    link.click();
  }, [canvasRef, hasImage]);

  const restoreResult = useCallback(async (item) => {
    const canvas = canvasRef.current;
    if (!canvas || !item.resultData) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
    };
    img.src = item.resultData;

    if (item.originalData) {
      const resp = await fetch(item.originalData);
      const blob = await resp.blob();
      const bitmap = await createImageBitmap(blob);
      setOriginalBitmap(bitmap);
    }

    setHasImage(true);
    setDetections(item.detections || []);
    setRuntime((current) => ({
      ...current,
      phase: "done",
      imageName: item.name,
      elapsed: item.elapsed,
      protoShape: item.protoShape,
      imageSize: item.imageSize,
      message: "히스토리에서 결과를 복구했습니다.",
    }));
  }, [canvasRef]);

  return {
    runtime,
    detections,
    stats,
    hasImage,
    isReady,
    isBusy,
    originalBitmap,
    modelUrl: MODEL_URL,
    loadModel,
    runImage,
    rerunLastImage,
    clearResult,
    downloadResult,
    restoreResult,
  };
}
