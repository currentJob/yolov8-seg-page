import { useState, useRef, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { SettingsSlider } from "../ui/SettingsSlider";

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

const MODELS = [
  { id: "yolov8-seg-half.onnx", name: "Fast Engine", desc: "FP16 / Speed Optimized", icon: "zap" },
  { id: "yolov8-seg.onnx", name: "Accurate Engine", desc: "FP32 / Precision Focused", icon: "target" }
];

export function Sidebar({ yolo, settings, updateSetting, sliderMeta, selectedModel, setSelectedModel }) {
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
            
            <div className="relative" ref={dropdownRef}>
              <button
                className={`w-full flex items-center justify-between transition-all duration-500 rounded-2xl px-4 py-3.5 border shadow-sm group/btn
                  ${isDropdownOpen 
                    ? 'bg-[var(--surface)] border-[var(--accent)] ring-4 ring-[var(--accent-glow)]' 
                    : 'bg-[var(--surface-muted)] border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--surface)] hover:shadow-md'
                  } text-[var(--text-strong)]`}
                onClick={() => !yolo.isBusy && setIsDropdownOpen(!isDropdownOpen)}
                disabled={yolo.isBusy}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm ${isDropdownOpen ? 'bg-[var(--accent)] text-white rotate-6 scale-110' : 'bg-[var(--surface)] text-[var(--accent)] border border-[var(--border)] group-hover/btn:scale-105'}`}>
                    <Icon name={activeModel.icon} size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-[14px] font-extrabold leading-none mb-1.5">{activeModel.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider leading-none">{activeModel.desc}</div>
                  </div>
                </div>
                <Icon name="chevron-down" size={18} className={`text-[var(--text-muted)] transition-transform duration-500 ${isDropdownOpen ? 'rotate-180 text-[var(--accent)]' : 'group-hover/btn:text-[var(--accent)]'}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+10px)] left-0 right-0 bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl shadow-2xl z-[100] overflow-hidden animate-slide-down backdrop-blur-3xl bg-opacity-95 ring-1 ring-black/5">
                  <div className="p-2">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-left mb-1 last:mb-0 group/item ${selectedModel === model.id ? 'bg-[var(--accent)] text-white shadow-lg' : 'hover:bg-[var(--surface-muted)]'}`}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0 ${selectedModel === model.id ? 'bg-white/20 text-white' : 'bg-[var(--surface-muted)] text-[var(--accent)] group-hover/item:scale-110'}`}>
                          <Icon name={model.icon} size={18} />
                        </div>
                        <div className="flex-1 flex items-center justify-between gap-3 overflow-hidden">
                          <div className="flex flex-col">
                            <span className={`text-[13px] font-bold whitespace-nowrap transition-colors ${selectedModel === model.id ? 'text-white' : 'text-[var(--text-strong)] group-hover/item:text-[var(--accent)]'}`}>
                              {model.name}
                            </span>
                            <span className={`text-[10px] font-medium whitespace-nowrap transition-colors ${selectedModel === model.id ? 'text-white/70' : 'text-[var(--text-muted)]'}`}>
                              {model.desc}
                            </span>
                          </div>
                        </div>
                        {selectedModel === model.id && (
                          <div className="text-white flex-shrink-0 animate-in zoom-in duration-300">
                            <Icon name="check" size={20} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
