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
              {/* Main Trigger - 시인성이 확보된 표준 색상 적용 */}
              <button
                className={`w-full flex items-center justify-between bg-[#1e1e2e] hover:bg-[#2a2a3c] text-white border-2 rounded-2xl px-4 py-3.5 transition-all duration-300 shadow-lg
                  ${isDropdownOpen ? 'border-[#3b82f6] ring-4 ring-blue-500/20' : 'border-[#313144]'} 
                  ${yolo.isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !yolo.isBusy && setIsDropdownOpen(!isDropdownOpen)}
                disabled={yolo.isBusy}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform ${isDropdownOpen ? 'bg-[#3b82f6] text-white scale-110' : 'bg-[#2a2a3c] text-[#3b82f6]'}`}>
                    <Icon name={activeModel.icon} size={22} />
                  </div>
                  <div className="text-left">
                    <div className="text-[15px] font-bold text-white leading-tight mb-0.5">{activeModel.name}</div>
                    <div className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{activeModel.desc}</div>
                  </div>
                </div>
                <Icon name="chevron-down" size={20} className={`text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
              </button>

              {/* Dropdown Menu - 배경과 대비되는 색상으로 재구성 */}
              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+10px)] left-0 right-0 bg-[#1e1e2e] border-2 border-[#313144] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] p-2 animate-slide-down">
                  <div className="text-[10px] font-bold text-gray-500 px-3 py-2 uppercase tracking-widest">Select Engine</div>
                  
                  {MODELS.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all mb-1 last:mb-0
                          ${isSelected ? 'bg-[#3b82f6] text-white' : 'text-gray-300 hover:bg-[#2a2a3c] hover:text-white'}`}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-colors 
                          ${isSelected ? 'bg-blue-500/30 border-white/20' : 'bg-[#2a2a3c] border-[#313144] text-blue-400'}`}>
                          <Icon name={model.icon} size={20} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-[14px] font-bold tracking-tight">{model.name}</div>
                          <div className={`text-[11px] opacity-70 ${isSelected ? 'text-white' : 'text-gray-400'}`}>{model.desc}</div>
                        </div>
                        {isSelected && <Icon name="check" size={18} className="text-white" />}
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
