import { useState, useCallback, useRef, useEffect } from "react";

export function useZoomPan() {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((prevScale) => {
      const zoomFactor = 0.1;
      const newScale = e.deltaY < 0 ? prevScale + zoomFactor : prevScale - zoomFactor;
      return Math.min(Math.max(1, newScale), 5);
    });
  }, []);

  // React의 onWheel은 passive로 등록되어 preventDefault()가 무시됨
  // → 직접 { passive: false }로 등록해야 스크롤을 막을 수 있음
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

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
    containerRef,
    scale,
    position,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoomPan,
    transformStyle: `translate(${position.x}px, ${position.y}px) scale(${scale})`
  };
}
