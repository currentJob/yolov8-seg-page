# YOLOv8-Seg Studio

브라우저에서 YOLOv8 segmentation 모델을 실행해 이미지 객체를 감지하고 마스크 결과를 확인하는 React + Vite 웹 애플리케이션입니다. ONNX Runtime Web과 Web Worker를 사용해 추론 작업을 브라우저 안에서 처리합니다.

## 주요 기능

- 이미지 업로드 또는 드래그 앤 드롭
- YOLOv8-Seg ONNX 모델 로드
- 객체 감지 결과와 segmentation mask 시각화
- Confidence, NMS IoU, Mask threshold 조정
- 감지 개수, 최고 점수, 평균 점수 표시
- 결과 이미지를 PNG로 저장
- GitHub Pages 배포용 Vite base path 설정

## 기술 스택

- React 22
- Vite 8
- ONNX Runtime Web
- Web Worker
- HTML Canvas
- GitHub Actions / GitHub Pages
