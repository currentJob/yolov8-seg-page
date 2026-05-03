import { useState, useCallback, useRef } from "react";

export function useZoomPan() {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((prevScale) => {
      const zoomFactor = 0.1;
      const newScale = e.deltaY < 0 ? prevScale + zoomFactor : prevScale - zoomFactor;
      return Math.min(Math.max(1, newScale), 5); // limit zoom between 1x and 5x
    });
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return; // Only left click
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || scale === 1) return;
    
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    setPosition((prev) => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
  }, [scale]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const resetZoomPan = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return {
    scale,
    position,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoomPan,
    transformStyle: `translate(${position.x}px, ${position.y}px) scale(${scale})`
  };
}
