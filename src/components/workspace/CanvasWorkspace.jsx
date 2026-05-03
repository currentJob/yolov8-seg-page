import { Icon } from "../ui/Icon";
import { Dropzone } from "./Dropzone";
import { useZoomPan } from "../../hooks/useZoomPan";

export function CanvasWorkspace({ 
  yolo, 
  canvasRef, 
  compareCanvasRef, 
  isComparing, 
  compareRatio, 
  setCompareRatio 
}) {
  const { 
    scale, 
    transformStyle, 
    handleWheel, 
    handleMouseDown, 
    handleMouseMove, 
    handleMouseUp, 
    resetZoomPan 
  } = useZoomPan();

  return (
    <div className="canvas-container relative overflow-hidden flex-1 flex items-center justify-center p-10">
      {yolo.hasImage ? (
        <div 
          className={`canvas-wrapper ${isComparing ? "is-comparing" : ""}`} 
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ transform: transformStyle, cursor: scale > 1 ? 'grab' : 'default', transformOrigin: 'center' }}
        >
          <canvas 
            ref={canvasRef} 
            className="result-canvas relative" 
            style={{ zIndex: 5 }}
          />
          
          {isComparing && yolo.originalBitmap && (
            <div className="comparison-overlay" style={{ zIndex: 10 }}>
              <canvas 
                ref={compareCanvasRef} 
                className="result-canvas absolute top-0 left-0"
                style={{ 
                  clipPath: `inset(0 ${100 - compareRatio * 100}% 0 0)`,
                  pointerEvents: 'none',
                  zIndex: 11
                }}
              />
              <div 
                className="comparison-handle"
                style={{ left: `${compareRatio * 100}%`, zIndex: 15 }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // 드래그 앤 드롭 패닝 이벤트와 충돌 방지
                  const rect = canvasRef.current.getBoundingClientRect();
                  const handleMove = (moveEvent) => {
                    const x = (moveEvent.clientX - rect.left) / rect.width;
                    setCompareRatio(Math.max(0, Math.min(1, x)));
                  };
                  window.addEventListener("mousemove", handleMove);
                  window.addEventListener("mouseup", () => window.removeEventListener("mousemove", handleMove), { once: true });
                }}
              />
            </div>
          )}
          
          {yolo.isBusy && (
            <div className="busy-overlay" style={{ zIndex: 50 }}>
              <div className="scanning-line" />
              <div className="busy-content">
                <div className="spinner" />
                <p>{yolo.runtime.phase === "loading" ? "Initializing AI Model..." : "Analyzing Image..."}</p>
                <div className="progress-container">
                  <div className="progress-bar" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Dropzone 
          disabled={yolo.isBusy} 
          isBusy={yolo.isBusy} 
          onFile={yolo.runImage}
          hasImage={false}
        >
          <label htmlFor="dropzone-input" className="empty-state cursor-pointer">
            <div className="empty-icon"><Icon name="zap" /></div>
            <h3>{yolo.isReady ? "AI 분석 준비 완료" : "모델 로드 필요"}</h3>
            <p>
              {yolo.isReady 
                ? "이미지를 클릭하여 업로드하거나 이곳으로 드래그해주세요." 
                : "좌측 메뉴에서 'Load Model' 버튼을 눌러 AI 모델을 먼저 로드해주세요."}
            </p>
          </label>
        </Dropzone>
      )}

      {/* 줌 리셋 버튼 */}
      {yolo.hasImage && scale !== 1 && (
        <button 
          className="absolute bottom-4 right-4 bg-[var(--surface)] text-[var(--text)] px-3 py-1.5 rounded shadow-lg border border-[var(--border)] text-xs z-20 font-semibold"
          onClick={resetZoomPan}
        >
          Reset Zoom ({Math.round(scale * 100)}%)
        </button>
      )}
    </div>
  );
}
