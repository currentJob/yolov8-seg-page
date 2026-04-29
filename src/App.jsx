import { useId, useRef, useState } from "react";
import { DEFAULT_SETTINGS, INPUT_SIZE } from "./lib/yoloSeg";
import { useYoloSeg } from "./hooks/useYoloSeg";
import "./App.css";

const sliderMeta = [
  {
    key: "confidence",
    label: "Confidence",
    hint: "낮추면 더 많이 찾고, 높이면 더 확실한 객체만 남깁니다.",
    min: 0.05,
    max: 0.9,
    step: 0.05,
  },
  {
    key: "iou",
    label: "NMS IoU",
    hint: "겹치는 박스를 병합하는 민감도입니다.",
    min: 0.1,
    max: 0.9,
    step: 0.05,
  },
  {
    key: "mask",
    label: "Mask",
    hint: "마스크 경계를 얼마나 단단하게 그릴지 조절합니다.",
    min: 0.1,
    max: 0.9,
    step: 0.05,
  },
];

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function StatusPill({ phase }) {
  const labelMap = {
    idle: "대기",
    loading: "모델 로드",
    ready: "준비 완료",
    running: "분석 중",
    done: "완료",
    error: "확인 필요",
  };

  return <span className={`status-pill status-pill--${phase}`}>{labelMap[phase] ?? phase}</span>;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SettingsSlider({ item, value, onChange }) {
  const id = useId();

  return (
    <label className="slider-control" htmlFor={id}>
      <span className="slider-control__top">
        <span>{item.label}</span>
        <strong>{formatPercent(value)}</strong>
      </span>
      <input
        id={id}
        type="range"
        min={item.min}
        max={item.max}
        step={item.step}
        value={value}
        onChange={(event) => onChange(item.key, Number(event.target.value))}
      />
      <small>{item.hint}</small>
    </label>
  );
}

function Dropzone({ disabled, isBusy, onFile }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!disabled && file) {
      onFile(file);
    }
  }

  return (
    <label
      className={`dropzone ${isDragging ? "dropzone--active" : ""} ${disabled ? "dropzone--disabled" : ""}`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <span className="dropzone__icon" aria-hidden="true">
        +
      </span>
      <strong>{isBusy ? "분석이 끝나는 중" : "이미지 업로드"}</strong>
      <span>클릭하거나 파일을 이 영역으로 드래그하세요.</span>
    </label>
  );
}

function DetectionList({ detections }) {
  if (detections.length === 0) {
    return <p className="empty-list">아직 감지된 객체가 없습니다.</p>;
  }

  return (
    <div className="detection-list">
      {detections.slice(0, 8).map((detection, index) => (
        <div className="detection-row" key={detection.id}>
          <span className="detection-row__rank">{index + 1}</span>
          <span>object</span>
          <strong>{formatPercent(detection.score)}</strong>
          <small>
            {Math.round(detection.x2 - detection.x1)} x {Math.round(detection.y2 - detection.y1)}
          </small>
        </div>
      ))}
    </div>
  );
}

function ControlPanel({
  settings,
  runtime,
  stats,
  hasImage,
  isReady,
  isBusy,
  modelUrl,
  onSettingChange,
  onLoadModel,
  onRunImage,
  onRerun,
  onDownload,
  onClear,
}) {
  return (
    <aside className="control-panel">
      <section className="panel-section">
        <div className="section-heading">
          <span>Runtime</span>
          <StatusPill phase={runtime.phase} />
        </div>
        <p className="status-message">{runtime.message}</p>
        <button className="button button--primary" disabled={isBusy} onClick={onLoadModel}>
          {isReady ? "모델 다시 로드" : "모델 로드"}
        </button>
        <code className="model-path">{modelUrl}</code>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <span>Input</span>
          <small>{INPUT_SIZE} x {INPUT_SIZE}</small>
        </div>
        <Dropzone disabled={!isReady || isBusy} isBusy={isBusy} onFile={onRunImage} />
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <span>Thresholds</span>
          <button className="text-button" disabled={!hasImage || isBusy} onClick={onRerun}>
            다시 분석
          </button>
        </div>
        <div className="sliders">
          {sliderMeta.map((item) => (
            <SettingsSlider
              item={item}
              key={item.key}
              value={settings[item.key]}
              onChange={onSettingChange}
            />
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="metric-grid">
          <Metric label="Detected" value={stats.count} />
          <Metric label="Best" value={formatPercent(stats.bestScore)} />
          <Metric label="Average" value={formatPercent(stats.avgScore)} />
        </div>
        <div className="action-row">
          <button className="button button--secondary" disabled={!hasImage} onClick={onDownload}>
            PNG 저장
          </button>
          <button className="button button--ghost" disabled={!hasImage || isBusy} onClick={onClear}>
            비우기
          </button>
        </div>
      </section>
    </aside>
  );
}

function LoadingOverlay({ runtime }) {
  return (
    <div className="inference-overlay" role="status" aria-live="polite">
      <div className="scanner">
        <span />
        <span />
        <span />
      </div>
      <strong>이미지 추론 중</strong>
      <p>{runtime.message}</p>
    </div>
  );
}

function Workspace({ canvasRef, runtime, detections, hasImage, isBusy }) {
  const showOverlay = runtime.phase === "running" || runtime.phase === "loading";

  return (
    <main className="workspace">
      <div className="workspace__topbar">
        <div>
          <h2>Segmentation Canvas</h2>
          <p>{runtime.imageName ?? "이미지를 선택하면 결과가 여기에 표시됩니다."}</p>
        </div>
        <div className="workspace__meta">
          {runtime.elapsed && <span>{runtime.elapsed.toFixed(1)} ms</span>}
          {runtime.imageSize && <span>{runtime.imageSize}</span>}
          {runtime.protoShape && <span>proto {runtime.protoShape}</span>}
        </div>
      </div>

      <div className={`canvas-shell ${showOverlay ? "canvas-shell--busy" : ""}`}>
        {!hasImage && (
          <div className="empty-canvas">
            <span>YOLOv8-Seg</span>
            <strong>모델을 로드한 뒤 이미지를 넣어보세요.</strong>
          </div>
        )}
        <canvas ref={canvasRef} className={hasImage ? "result-canvas" : "result-canvas is-hidden"} />
        {isBusy && <LoadingOverlay runtime={runtime} />}
      </div>

      <section className="results-panel">
        <div className="section-heading">
          <span>Detections</span>
          <small>상위 8개 표시</small>
        </div>
        <DetectionList detections={detections} />
      </section>
    </main>
  );
}

export default function App() {
  const canvasRef = useRef(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const yolo = useYoloSeg(canvasRef, settings);

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Browser AI vision lab</p>
          <h1>YOLOv8-Seg Studio</h1>
          <p className="app-header__copy">
            React 19 기반의 가벼운 클라이언트 앱으로 ONNX 세그멘테이션 결과를 확인하고 튜닝합니다.
          </p>
        </div>
        <div className="header-card" aria-label="현재 실행 상태">
          <StatusPill phase={yolo.runtime.phase} />
          <strong>{yolo.stats.count}</strong>
          <span>detections</span>
        </div>
      </header>

      <div className="app-layout">
        <ControlPanel
          settings={settings}
          runtime={yolo.runtime}
          stats={yolo.stats}
          hasImage={yolo.hasImage}
          isReady={yolo.isReady}
          isBusy={yolo.isBusy}
          modelUrl={yolo.modelUrl}
          onSettingChange={updateSetting}
          onLoadModel={yolo.loadModel}
          onRunImage={yolo.runImage}
          onRerun={yolo.rerunLastImage}
          onDownload={yolo.downloadResult}
          onClear={yolo.clearResult}
        />
        <Workspace
          canvasRef={canvasRef}
          runtime={yolo.runtime}
          detections={yolo.detections}
          hasImage={yolo.hasImage}
          isBusy={yolo.isBusy}
        />
      </div>
    </div>
  );
}
