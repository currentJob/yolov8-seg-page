export function TopBar({ yolo }) {
  return (
    <header className="workspace-header top-bar">
      <div className="workspace-title">
        <div className="status-indicator" />
        <h2>{yolo.runtime.imageName || "Workspace"}</h2>
        <div className="file-info text-xs text-[var(--text-muted)] mt-1">
          {yolo.hasImage && `${yolo.originalBitmap?.width}x${yolo.originalBitmap?.height}px`}
        </div>
      </div>
    </header>
  );
}
