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
            
          <div className="mb-10">
            {/* Section Header */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
              <label className="text-[11px] font-black text-gray-500 uppercase tracking-[0.25em]">
                Compute Engine
              </label>
            </div>
            
            {/* Modern Segmented Control */}
            <div className="relative p-1 bg-black/40 border border-white/5 rounded-2xl flex backdrop-blur-xl shadow-2xl">
              {/* Sliding Highlight Background */}
              <div 
                className="absolute inset-y-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] bg-gradient-to-br from-blue-600 to-blue-700 rounded-[12px] shadow-[0_8px_20px_rgba(37,99,235,0.3)] border border-white/20"
                style={{ 
                  width: 'calc(50% - 4px)', 
                  left: selectedModel === 'yolov8-seg-half.onnx' ? '4px' : 'calc(50%)' 
                }}
              />
              
              {MODELS.map((model) => {
                const isSelected = selectedModel === model.id;
                return (
                  <button
                    key={model.id}
                    className={`relative flex-1 flex flex-col items-center justify-center py-4 z-10 transition-all duration-300 
                      ${isSelected ? 'text-white scale-100' : 'text-gray-500 hover:text-gray-300 scale-95 hover:scale-100'}`}
                    onClick={() => !yolo.isBusy && setSelectedModel(model.id)}
                    disabled={yolo.isBusy}
                  >
                    <Icon name={model.icon} size={20} className={`mb-1.5 transition-transform duration-500 ${isSelected ? 'rotate-0' : '-rotate-12 opacity-50'}`} />
                    <span className="text-[13px] font-black tracking-tight leading-none mb-1">{model.name.split(' ')[0]}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest opacity-60 transition-opacity ${isSelected ? 'opacity-90' : 'opacity-40'}`}>
                      {model.id.includes('half') ? 'Speed' : 'Precision'}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Status Info Badge */}
            <div className="mt-3 px-1 flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
              <span>Latency Optimized</span>
              <span className="text-blue-500/50">v8.0.10</span>
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
