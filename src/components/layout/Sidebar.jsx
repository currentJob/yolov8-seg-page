import { Icon } from "../ui/Icon";
import { SettingsSlider } from "../ui/SettingsSlider";

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function Sidebar({ yolo, settings, updateSetting, sliderMeta, selectedModel, setSelectedModel }) {
  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <p className="eyebrow">Vision AI Lab</p>
        <h1>YOLOv8-Seg</h1>
        <p>Real-time segmentation on edge</p>
      </header>

      <div className="sidebar-content">
        <section className="panel-section stagger-1">
          <div className="section-title">
            <span>Runtime Status</span>
            <span className={`status-pill ${yolo.runtime.phase}`}>
              {yolo.runtime.phase}
            </span>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Model Selection</label>
            <div className="flex bg-[var(--bg)] border border-[var(--border)] rounded-lg p-1 gap-1">
              <button
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                  selectedModel === "yolov8-seg-half.onnx"
                    ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-strong)] border border-transparent"
                }`}
                onClick={() => setSelectedModel("yolov8-seg-half.onnx")}
                disabled={yolo.isBusy}
              >
                Fast (FP16)
              </button>
              <button
                className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
                  selectedModel === "yolov8-seg.onnx"
                    ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm border border-[var(--border)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-strong)] border border-transparent"
                }`}
                onClick={() => setSelectedModel("yolov8-seg.onnx")}
                disabled={yolo.isBusy}
              >
                Accurate (FP32)
              </button>
            </div>
          </div>
          <button 
            className={`btn btn-primary w-full ${yolo.runtime.phase === "loading" ? "btn-loading" : ""}`} 
            onClick={yolo.loadModel}
            disabled={yolo.isBusy}
          >
            <Icon name="layers" />
            {yolo.isReady ? "Reload Model" : "Load Model"}
          </button>
          <p className="status-msg mt-3 text-xs opacity-60">{yolo.runtime.message}</p>
        </section>

        <section className="panel-section stagger-3">
          <div className="section-title">
            <span>Parameters</span>
            <button
              className="btn-ghost text-xs"
              onClick={yolo.rerunLastImage}
              disabled={!yolo.hasImage || yolo.isBusy}
            >
              Rerun
            </button>
          </div>
          <div className="slider-group">
            {sliderMeta.map(item => (
              <SettingsSlider
                key={item.key}
                item={item}
                value={settings[item.key]}
                onChange={updateSetting}
              />
            ))}
          </div>
        </section>

        <section className="panel-section stagger-4">
          <div className="section-title">Metrics</div>
          <div className="metric-grid-compact grid grid-cols-2 gap-3">
            <div className="metric-box">
              <small>Objects</small>
              <strong>{yolo.stats.count}</strong>
            </div>
            <div className="metric-box">
              <small>Confidence</small>
              <strong>{formatPercent(yolo.stats.bestScore)}</strong>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              className="btn btn-secondary flex-1"
              onClick={yolo.downloadResult}
              disabled={!yolo.hasImage}
            >
              <Icon name="download" /> Export
            </button>
            <button
              className="btn btn-ghost"
              onClick={yolo.clearResult}
              disabled={!yolo.hasImage || yolo.isBusy}
            >
              <Icon name="trash" />
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
