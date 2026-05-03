import { useId, useRef, useState, useEffect, useCallback } from "react";
import { DEFAULT_SETTINGS, INPUT_SIZE } from "./lib/yoloSeg";
import { useYoloSeg } from "./hooks/useYoloSeg";
import "./App.css";

const sliderMeta = [
  { key: "confidence", label: "Confidence", min: 0.05, max: 0.9, step: 0.05 },
  { key: "iou", label: "NMS IoU", min: 0.1, max: 0.9, step: 0.05 },
  { key: "mask", label: "Mask", min: 0.1, max: 0.9, step: 0.05 },
];

const Icon = ({ name }) => {
  const icons = {
    upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12"/>,
    layers: <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>,
    history: <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>,
    trash: <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6m4-6v6"/>,
    download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m-7-5-4 4-4-4m4 4V3"/>,
    sun: <circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>,
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>,
    check: <path d="M20 6 9 17l-5-5"/>,
    zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>,
    eye: <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name]}
    </svg>
  );
};

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function Dropzone({ disabled, isBusy, onFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const id = useId();

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!disabled && file) onFile(file);
  }

  return (
    <label
      className={`dropzone ${isDragging ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      htmlFor={id}
    >
      <input
        id={id}
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => onFile(event.target.files?.[0])}
        style={{ display: "none" }}
      />
      <div className="dropzone-icon">
        <Icon name="upload" />
      </div>
      <div className="dropzone-text">
        <strong>{isBusy ? "Processing..." : "Upload Image"}</strong>
        <p>Drop file or click to browse</p>
      </div>
    </label>
  );
}

function SettingsSlider({ item, value, onChange }) {
  const id = useId();
  return (
    <div className="slider-item">
      <div className="slider-header">
        <span>{item.label}</span>
        <strong>{formatPercent(value)}</strong>
      </div>
      <input
        id={id}
        type="range"
        min={item.min}
        max={item.max}
        step={item.step}
        value={value}
        onChange={(e) => onChange(item.key, Number(e.target.value))}
      />
    </div>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const compareCanvasRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem("yolo-history") || "[]"));
  const [isComparing, setIsComparing] = useState(false);
  const [compareRatio, setCompareRatio] = useState(0.5);
  
  const yolo = useYoloSeg(canvasRef, settings);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Handle history updates
  useEffect(() => {
    if (yolo.runtime.phase === "done" && yolo.hasImage) {
      const canvas = canvasRef.current;
      if (canvas) {
        const thumb = canvas.toDataURL("image/jpeg", 0.6);
        setHistory(prev => {
          const next = [{ id: Date.now(), thumb, name: yolo.runtime.imageName }, ...prev].slice(0, 10);
          localStorage.setItem("yolo-history", JSON.stringify(next));
          return next;
        });
      }
    }
  }, [yolo.runtime.phase, yolo.hasImage, yolo.runtime.imageName]);

  // Drawing original for comparison
  useEffect(() => {
    if (isComparing && yolo.originalBitmap && compareCanvasRef.current) {
      const canvas = compareCanvasRef.current;
      canvas.width = yolo.originalBitmap.width;
      canvas.height = yolo.originalBitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(yolo.originalBitmap, 0, 0);
    }
  }, [isComparing, yolo.originalBitmap]);

  const updateSetting = (key, value) => {
    setSettings(curr => ({ ...curr, [key]: value }));
  };

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  return (
    <div className="app-container">
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
            <button 
              className="btn btn-primary w-full" 
              onClick={yolo.loadModel}
              disabled={yolo.isBusy}
            >
              <Icon name="layers" />
              {yolo.isReady ? "Reload Model" : "Load Model"}
            </button>
            <p className="status-msg mt-3 text-xs opacity-60">{yolo.runtime.message}</p>
          </section>

          <section className="panel-section stagger-2">
            <div className="section-title">Input & Control</div>
            <Dropzone 
              disabled={yolo.isBusy} 
              isBusy={yolo.isBusy} 
              onFile={yolo.runImage} 
            />
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
                <Icon name="download" /> PNG
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

      <main className="main-content">
        <header className="top-bar">
          <div className="workspace-header">
            <h2>Canvas Workspace</h2>
          </div>
          <div className="top-actions">
            {yolo.hasImage && (
              <button 
                className={`btn ${isComparing ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setIsComparing(!isComparing)}
              >
                <Icon name="eye" />
                Compare
              </button>
            )}
            <button className="btn btn-secondary" onClick={toggleTheme}>
              <Icon name={theme === "light" ? "moon" : "sun"} />
            </button>
          </div>
        </header>

        <div className="canvas-container">
          {!yolo.hasImage && (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="zap" /></div>
              <h3>Ready to Analyze</h3>
              <p>Load the model and drop an image to see the AI in action.</p>
            </div>
          )}
          
          <div className={`canvas-wrapper ${isComparing ? "is-comparing" : ""}`}>
            <canvas 
              ref={canvasRef} 
              className={`result-canvas ${yolo.hasImage ? "" : "hidden"}`} 
            />
            {isComparing && yolo.originalBitmap && (
              <div className="comparison-overlay">
                <canvas 
                  ref={compareCanvasRef} 
                  className="result-canvas absolute top-0 left-0"
                  style={{ clipPath: `inset(0 ${100 - compareRatio * 100}% 0 0)` }}
                />
                <div 
                  className="comparison-handle"
                  style={{ left: `${compareRatio * 100}%` }}
                  onMouseDown={() => {
                    const move = (e) => {
                      const rect = canvasRef.current.getBoundingClientRect();
                      const x = (e.clientX - rect.left) / rect.width;
                      setCompareRatio(Math.max(0, Math.min(1, x)));
                    };
                    window.addEventListener("mousemove", move);
                    window.addEventListener("mouseup", () => window.removeEventListener("mousemove", move), { once: true });
                  }}
                />
              </div>
            )}
            
            {yolo.isBusy && (
              <div className="busy-overlay">
                <div className="spinner" />
                <p>Processing...</p>
              </div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <footer className="history-tray">
            <div className="history-label">Recent</div>
            {history.map(item => (
              <div key={item.id} className="history-item">
                <img src={item.thumb} alt={item.name} title={item.name} />
              </div>
            ))}
          </footer>
        )}
      </main>
    </div>
  );
}
