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
              {/* Main Trigger Button */}
              <button
                className={`w-full group/btn relative flex items-center justify-between p-1 rounded-2xl border-2 transition-all duration-500 overflow-hidden
                  ${isDropdownOpen 
                    ? 'border-[var(--accent)] shadow-[0_0_25px_rgba(var(--accent-h),var(--accent-s),60%,0.2)] bg-[var(--accent)]' 
                    : 'border-[var(--border)] bg-[var(--border)] hover:border-[var(--accent)] hover:shadow-lg'
                  } ${yolo.isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !yolo.isBusy && setIsDropdownOpen(!isDropdownOpen)}
                disabled={yolo.isBusy}
              >
                {/* Inner Content Area */}
                <div className="flex items-center gap-3 bg-[var(--surface)] w-full py-3 px-4 rounded-[14px] transition-colors duration-500">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 shadow-inner ${isDropdownOpen ? 'bg-[var(--accent)] text-white rotate-12 scale-110' : 'bg-[var(--surface-muted)] text-[var(--accent)]'}`}>
                    <Icon name={activeModel.icon} size={22} className={isDropdownOpen ? 'animate-pulse' : ''} />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="block text-[15px] font-black tracking-tight leading-none mb-1">{activeModel.name}</span>
                    <span className="block text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.15em] leading-none">{activeModel.desc}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isDropdownOpen ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]'}`}>
                    <Icon name="chevron-down" size={18} className={`transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Premium Floating Menu */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-[var(--surface)] border-2 border-[var(--border)] rounded-2xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-[100] animate-slide-down backdrop-blur-3xl ring-1 ring-white/10 p-2">
                  <div className="text-[10px] font-black text-[var(--text-muted)] px-3 py-2 uppercase tracking-[0.2em] opacity-40">Select Engine</div>
                  
                  {MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-300 mb-1 last:mb-0 group/item relative overflow-hidden
                          ${isSelected ? 'bg-[var(--accent)] text-white shadow-lg' : 'hover:bg-[var(--surface-muted)]'}`}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center border-2 transition-all duration-300 flex-shrink-0
                          ${isSelected ? 'bg-white/20 border-white/30' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--accent)] group-hover/item:border-[var(--accent)] group-hover/item:scale-105'}`}>
                          <Icon name={model.icon} size={22} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className={`text-[14px] font-black tracking-tight mb-0.5 ${isSelected ? 'text-white' : 'text-[var(--text-strong)] group-hover/item:text-[var(--accent)]'}`}>{model.name}</div>
                          <div className={`text-[11px] font-semibold opacity-70 ${isSelected ? 'text-white' : 'text-[var(--text-muted)]'}`}>{model.desc}</div>
                        </div>
                        {isSelected && (
                          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center animate-in zoom-in duration-300">
                            <Icon name="check" size={16} />
                          </div>
                        )}
                      </button>
                    );
                  })}
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
