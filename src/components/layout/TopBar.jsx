import { Icon } from "../ui/Icon";

export function TopBar({ yolo, isComparing, setIsComparing, theme, toggleTheme }) {
  return (
    <header className="workspace-header top-bar">
      <div className="workspace-title">
        <div className="status-indicator" />
        <h2>{yolo.runtime.imageName || "Workspace"}</h2>
        <div className="file-info text-xs text-[var(--text-muted)] mt-1">
          {yolo.hasImage && `${yolo.originalBitmap?.width}x${yolo.originalBitmap?.height}px`}
        </div>
      </div>
      <div className="top-actions">
        {yolo.hasImage && (
          <>
            <input
              id="header-upload"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (!file.type.startsWith("image/")) {
                    alert("이미지 파일만 업로드할 수 있습니다. (JPG, PNG 등 지원)");
                    return;
                  }
                  yolo.runImage(file);
                }
                e.target.value = null;
              }}
              style={{ display: "none" }}
            />
            <label htmlFor="header-upload" className="btn btn-secondary cursor-pointer">
              <Icon name="upload" />
              New Image
            </label>
            <button 
              className={`btn ${isComparing ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setIsComparing(!isComparing)}
            >
              <Icon name="eye" />
              Compare
            </button>
          </>
        )}
        <button className="btn btn-secondary" onClick={toggleTheme}>
          <Icon name={theme === "light" ? "moon" : "sun"} />
        </button>
      </div>
    </header>
  );
}
