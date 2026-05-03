import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MODEL_URL } from "../lib/yoloSeg";

const initialRuntime = {
  phase: "idle",
  message: "모델을 로드하면 브라우저에서 바로 이미지를 분석할 수 있습니다.",
  elapsed: null,
  protoShape: null,
  imageName: null,
  imageSize: null,
};

function createWorker() {
  return new Worker(new URL("../workers/yoloSeg.worker.js", import.meta.url), {
    type: "module",
  });
}

export function useYoloSeg(canvasRef, settings) {
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastFileRef = useRef(null);
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

      if (id !== requestIdRef.current) return;

      if (type === "loaded") {
        setRuntime((current) => ({
          ...current,
          phase: "ready",
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
        }

        result.bitmap.close();

        startTransition(() => {
          setHasImage(true);
          setDetections(result.detections);
          setRuntime((current) => ({
            ...current,
            phase: "done",
            elapsed: result.elapsed,
            protoShape: result.protoShape,
            imageSize: result.imageSize,
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

    worker.onerror = (event) => {
      setRuntime((current) => ({
        ...current,
        phase: "error",
        message: `Worker 오류: ${event.message}`,
      }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [canvasRef]);

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
      message: "Worker에서 ONNX 모델과 WASM 런타임을 준비하는 중입니다.",
    }));

    postWorkerMessage({ type: "load" });
  }, [postWorkerMessage]);

  const runImage = useCallback(
    async (file) => {
      if (!file) return;

      lastFileRef.current = file;
      setDetections([]);

      // 원본 비트맵 저장 (비교용)
      const bitmap = await createImageBitmap(file);
      setOriginalBitmap(bitmap);

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
          : "추론 작업을 Worker로 보냈습니다. 화면은 계속 조작할 수 있습니다.",
      }));

      if (needsLoad) {
        postWorkerMessage({ type: "load" });
      }

      // ImageBitmap 생성 및 전송
      const bitmap = await createImageBitmap(file);
      setOriginalBitmap(bitmap);

      // 분석용 Worker 전송용 Bitmap (별도 생성)
      const workerBitmap = await createImageBitmap(file);

      const worker = workerRef.current;
      if (worker) {
        requestIdRef.current += 1;
        const id = requestIdRef.current;
        worker.postMessage({
          id,
          type: "run",
          bitmap: workerBitmap,
          settings
        }, [workerBitmap]);
      }
    },
    [postWorkerMessage, settings, runtime.phase]
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

    // 이미지 로드 및 캔버스 그리기
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
    };
    img.src = item.resultData;

    // 원본 비트맵 복구
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
