import { useState, useEffect, useCallback } from "react";

export function useHistory(yolo, canvasRef) {
  const [history, setHistory] = useState([]);

  // 히스토리에 아이템 추가
  useEffect(() => {
    if (yolo.runtime.phase === "done" && yolo.hasImage && yolo.originalBitmap && canvasRef.current) {
      const createHistoryItem = async () => {
        try {
          const resultData = canvasRef.current.toDataURL("image/jpeg", 0.6);
          
          const origCanvas = document.createElement('canvas');
          origCanvas.width = yolo.originalBitmap.width;
          origCanvas.height = yolo.originalBitmap.height;
          const ctx = origCanvas.getContext('2d');
          ctx.drawImage(yolo.originalBitmap, 0, 0);
          const originalData = origCanvas.toDataURL('image/jpeg', 0.8);

          setHistory(prev => {
            const filtered = prev.filter(item => item.name !== yolo.runtime.imageName);
            const next = [{ 
              id: Date.now(), 
              thumb: resultData, 
              resultData,
              originalData,
              name: yolo.runtime.imageName,
              detections: yolo.detections,
              elapsed: yolo.runtime.elapsed,
              protoShape: yolo.runtime.protoShape,
              imageSize: yolo.runtime.imageSize
            }, ...filtered].slice(0, 8);
            
            return next;
          });
        } catch (err) {
          console.error("Failed to generate thumbnail", err);
        }
      };
      createHistoryItem();
    }
  }, [yolo.runtime.phase, yolo.hasImage, yolo.originalBitmap, yolo.runtime.imageName, yolo.detections, yolo.runtime.elapsed, yolo.runtime.protoShape, yolo.runtime.imageSize, canvasRef]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    history,
    setHistory,
    clearHistory
  };
}
