import { Icon } from "../ui/Icon";

const EP_LABEL = { "webgpu-f16": "GPU F16", "webgpu-f32": "GPU F32", wasm: "CPU" };

/** 상단 헤더: 로고·워드마크, 이미지 열기·비교, 모델 상태, 소스 링크. 모바일에서는 아이콘만 보인다. */
export function AppHeader({ yolo, isComparing, setIsComparing }) {
  const ready = yolo.isReady && !yolo.isBusy;
  const status = yolo.isBusy ? "작업 중" : yolo.isReady ? `준비됨 · ${EP_LABEL[yolo.runtime.ep] || "—"}` : "모델 필요";
  return (
    <header className="cj-header">
      <a className="cj-brand" href="./">
        <span className="cj-brand-mark"><Icon name="logo" className="" /></span><span>YOLOv8-Seg</span>
      </a>
      <nav className="cj-nav" aria-label="작업">
        <label aria-label="이미지 열기" className={ready ? undefined : "is-disabled"} title={ready ? undefined : "먼저 모델을 불러오세요"}>
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={!ready}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.type.startsWith("image/")) yolo.runImage(file);
              e.target.value = null;
            }}
          />
          <Icon name="image" className="cj-ic" /><span className="cj-label">이미지 열기</span>
        </label>
        <button type="button" onClick={() => setIsComparing(!isComparing)} disabled={!yolo.hasImage} aria-pressed={isComparing} aria-label="원본과 비교">
          <Icon name="compare" className="cj-ic" /><span className="cj-label">비교</span>
        </button>
      </nav>
      <div className="cj-header-actions">
        <span className="cj-badge yolo-status" title="모델 상태"><Icon name="cpu" className="cj-ic" />{status}</span>
        <a className="cj-pill" href="https://github.com/currentJob/yolov8-seg-page" target="_blank" rel="noreferrer" aria-label="소스 코드 (GitHub)">
          <Icon name="github" className="cj-ic" /><span className="cj-label">소스</span>
        </a>
      </div>
    </header>
  );
}
