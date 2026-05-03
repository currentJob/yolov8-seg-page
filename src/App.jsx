import { useState, useEffect, useRef } from "react";
import { useYoloSeg } from "./hooks/useYoloSeg";
import { useHistory } from "./hooks/useHistory";
import { useKeyboard } from "./hooks/useKeyboard";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { CanvasWorkspace } from "./components/workspace/CanvasWorkspace";
import "./App.css";

const DEFAULT_SETTINGS = {
  confidenceThreshold: 0.25,
  iouThreshold: 0.45,
  maskThreshold: 0.5,
};

const sliderMeta = [
  { key: "confidenceThreshold", label: "Confidence", min: 0.1, max: 1.0, step: 0.01 },
  { key: "iouThreshold", label: "IoU", min: 0.1, max: 1.0, step: 0.01 },
  { key: "maskThreshold", label: "Mask", min: 0.1, max: 1.0, step: 0.01 },
];

export default function App() {
  const canvasRef = useRef(null);
  const compareCanvasRef = useRef(null);
  
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("yoloSettings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  
  const [selectedModel, setSelectedModel] = useState("yolov8-seg-half.onnx");
  const [isComparing, setIsComparing] = useState(false);
  const [compareRatio, setCompareRatio] = useState(0.5);

  const yolo = useYoloSeg(canvasRef, settings, selectedModel);
  const { history } = useHistory(yolo, canvasRef);

  useKeyboard({
    " ": () => yolo.hasImage && setIsComparing(prev => !prev),
    "delete": () => yolo.hasImage && yolo.clearResult(),
    "backspace": () => yolo.hasImage && yolo.clearResult(),
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("yoloSettings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (isComparing && yolo.originalBitmap && compareCanvasRef.current) {
      const cvs = compareCanvasRef.current;
      cvs.width = yolo.originalBitmap.width;
      cvs.height = yolo.originalBitmap.height;
      const ctx = cvs.getContext("2d");
      ctx.drawImage(yolo.originalBitmap, 0, 0);
    }
  }, [isComparing, yolo.originalBitmap]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));
  const updateSetting = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  const handleHistoryClick = async (item) => {
    try {
      await yolo.restoreHistory(item);
      setIsComparing(false);
    } catch (err) {
      console.error("Failed to restore history", err);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        yolo={yolo}
        settings={settings}
        updateSetting={updateSetting}
        sliderMeta={sliderMeta}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      <main className="main-content">
        <TopBar 
          yolo={yolo}
          isComparing={isComparing}
          setIsComparing={setIsComparing}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <CanvasWorkspace 
          yolo={yolo}
          canvasRef={canvasRef}
          compareCanvasRef={compareCanvasRef}
          isComparing={isComparing}
          compareRatio={compareRatio}
          setCompareRatio={setCompareRatio}
        />

        {history.length > 0 && (
          <footer className="history-tray">
            <div className="history-label">Recent</div>
            <div className="flex gap-4 overflow-x-auto pb-2 w-full max-w-full">
              {history.map(item => (
                <div 
                  key={item.id} 
                  className={`history-item ${yolo.runtime.imageName === item.name ? "active" : ""}`}
                  onClick={() => handleHistoryClick(item)}
                >
                  <img src={item.thumb} alt={item.name} />
                </div>
              ))}
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
