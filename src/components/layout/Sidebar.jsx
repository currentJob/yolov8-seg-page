import { Icon } from "../ui/Icon";
import { SettingsSlider } from "../ui/SettingsSlider";
import { Dropzone } from "../workspace/Dropzone";

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function formatMs(ms) {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

const MODELS = [
  { id: "yolov8-seg-half.onnx",   name: "Nano",   tag: "n · FP16", desc: "Speed",    icon: "zap"    },
  { id: "yolov8m-seg-half.onnx",  name: "Medium", tag: "m · FP16", desc: "Balanced", icon: "tool"   },
  { id: "yolov8-seg.onnx",        name: "Nano",   tag: "n · FP32", desc: "Precise",  icon: "target" },
];

const THUMB_LEFTS = ["4px", "calc(33.333% + 1.333px)", "calc(66.667% - 1.333px)"];

const EP_LABEL = {
  "webgpu-f16": "GPU F16",
  "webgpu-f32": "GPU F32",
  "wasm": "CPU",
};

const EP_TOOLTIP = {
  "webgpu-f16": "WebGPU · FP16 네이티브 연산 (빠름, 정밀도 tradeoff)",
  "webgpu-f32": "WebGPU · FP32 연산 (빠름, 정밀도 우수)",
  "wasm": "WASM CPU · FP32 승격 연산 (정밀도 최우선)",
};

export function Sidebar({ yolo, settings, updateSetting, sliderMeta, selectedModel, setSelectedModel, onUpload }) {
  const modelIndex = MODELS.findIndex(m => m.id === selectedModel);
  const activeIndex = modelIndex < 0 ? 0 : modelIndex;

  return (
    <aside className="sidebar">
      <header className="sidebar-header">
        <p className="eyebrow">Vision AI Lab</p>
        <h1>YOLOv8-Seg</h1>
        <p>Real-time instance segmentation</p>
      </header>

      <div className="sidebar-content">
        <section className="panel-section stagger-1">
          <div className="section-title">
            <span>Model Engine</span>
            <span className={`status-pill ${yolo.runtime.phase}`}>
              {yolo.runtime.phase}
            </span>
          </div>

          <div className="model-selector-group">
            <div className="model-selector-header">
              <div className="selector-dot" />
              <label>Compute Engine</label>
            </div>

            <div className="model-selector-track">
              <div
                className="model-selector-thumb"
                style={{ left: THUMB_LEFTS[activeIndex] }}
              />
              {MODELS.map((model, i) => {
                const isSelected = i === activeIndex;
                return (
                  <button
                    key={model.id}
                    className={`model-selector-option ${isSelected ? "active" : ""}`}
                    onClick={() => !yolo.isBusy && setSelectedModel(model.id)}
                    disabled={yolo.isBusy}
                    title={`${model.name} (${model.tag})`}
                  >
                    <div className="model-icon-wrap">
                      <Icon name={model.icon} size={18} />
                    </div>
                    <span className="model-name">{model.name}</span>
                    <span className="model-desc">{model.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="model-selector-footer">
              <span>{MODELS[activeIndex].tag}</span>
              {yolo.runtime.ep && (
                <span className={`ep-badge ${yolo.runtime.ep}`} title={EP_TOOLTIP[yolo.runtime.ep]}>
                  {EP_LABEL[yolo.runtime.ep]}
                </span>
              )}
              <span>YOLOv8</span>
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
          <p className={`status-msg mt-3 text-xs ${yolo.runtime.phase}`}>{yolo.runtime.message}</p>
        </section>

        <section className="panel-section stagger-2 upload-section">
          <div className="section-title">
            <span>Image Upload</span>
            {yolo.hasImage && <span className="status-pill done">Loaded</span>}
          </div>
          <Dropzone disabled={yolo.isBusy} isBusy={yolo.isBusy} onFile={onUpload} hasImage={yolo.hasImage} inputId="sidebar-upload-input">
            <label
              htmlFor="sidebar-upload-input"
              className={`sidebar-upload-btn ${yolo.isBusy ? "disabled" : ""}`}
            >
              <Icon name="upload" size={20} />
              <span>{yolo.hasImage ? "Change Image" : "Upload Image"}</span>
              <span className="sidebar-upload-hint">or drag & drop</span>
            </label>
          </Dropzone>
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
          <div className="metric-grid-compact grid grid-cols-3 gap-2">
            <div className="metric-box">
              <small>Objects</small>
              <strong>{yolo.stats.count}</strong>
            </div>
            <div className="metric-box">
              <small>Conf.</small>
              <strong>{formatPercent(yolo.stats.bestScore)}</strong>
            </div>
            <div className="metric-box">
              <small>Time</small>
              <strong>{formatMs(yolo.runtime.elapsed)}</strong>
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
