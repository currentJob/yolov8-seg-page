import { useState } from "react";

export function Dropzone({ disabled, isBusy, onFile, children, hasImage }) {
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드할 수 있습니다. (JPG, PNG 등 지원)");
      return;
    }
    if (!disabled) onFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div
      className={`dropzone ${isDragging ? "active" : ""} ${disabled ? "disabled" : ""} ${hasImage ? "dropzone-full" : "dropzone-empty"}`}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        id="dropzone-input"
        type="file"
        accept="image/*"
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // 동일한 파일을 다시 선택할 수 있도록 value 초기화
          event.target.value = null;
        }}
        style={{ display: "none" }}
      />
      {children}
    </div>
  );
}
