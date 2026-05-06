import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { SettingsSlider } from "../ui/SettingsSlider";
import { Dropzone } from "../workspace/Dropzone";

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

const MODELS = [
  { id: "yolov8-seg-half.onnx", name: "Fast Engine", desc: "FP16 / Speed Optimized", icon: "zap" },
  { id: "yolov8-seg.onnx", name: "Accurate Engine", desc: "FP32 / Precision Focused", icon: "target" }
];

export function Sidebar({ yolo, settings, updateSetting, sliderMeta, selectedModel, setSelectedModel, onUpload }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon name="layers" size={14} className="text-[var(--accent)]" />
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Model Engine
              </label>
            </div>
            
          <div className="model-selector-group">
            <div className="model-selector-header">
              <div className="selector-dot" />
              <label>Compute Engine</label>
            </div>
            
            <div className="model-selector-track">
              <div 
                className="model-selector-thumb"
                style={{ 
                  transform: selectedModel === 'yolov8-seg-half.onnx' ? 'translateX(0)' : 'translateX(100%)' 
                }}
              />
              
              {MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    className={`model-selector-option ${isSelected ? 'active' : ''}`}
                    onClick={() => !yolo.isBusy && setSelectedModel(model.id)}
                    disabled={yolo.isBusy}
                  >
                    <div className="model-icon-wrap">
                      <Icon name={model.icon} size={20} />
                    </div>
                    <span className="model-name">{model.name.split(' ')[0]}</span>
                    <span className="model-desc">
                      {model.id.includes('half') ? 'Speed' : 'Precision'}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="model-selector-footer">
              <span>Latency Optimized</span>
              <span>v8.0.10</span>
            </div>
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
            {yolo.hasImage && (
              <span className="status-pill done">Loaded</span>
            )}
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
