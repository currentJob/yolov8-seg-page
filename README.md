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

- React 19
- Vite 8
- ONNX Runtime Web
- Web Worker
- HTML Canvas
- GitHub Actions / GitHub Pages

## 프로젝트 구조

```text
.
├── public/
│   └── models/
│       └── yolov8-seg.onnx
├── src/
│   ├── hooks/
│   │   └── useYoloSeg.js
│   ├── lib/
│   │   └── yoloSeg.js
│   ├── workers/
│   │   └── yoloSeg.worker.js
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── index.html
├── package.json
└── vite.config.js
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 모델 파일 준비

앱은 아래 경로의 ONNX 모델을 불러옵니다.

```text
public/models/yolov8-seg.onnx
```

대용량 모델 파일은 `.gitignore`에서 제외되어 있으므로, 새 환경에서 실행할 때는 같은 경로에 모델 파일을 직접 넣어야 합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

Vite가 출력하는 로컬 주소로 접속한 뒤, 모델을 로드하고 이미지를 업로드하면 추론 결과를 확인할 수 있습니다.

## 사용 가능한 명령어

```bash
npm run dev
```

개발 서버를 실행합니다.

```bash
npm run build
```

프로덕션 빌드를 생성합니다. 결과물은 `dist` 폴더에 만들어집니다.

```bash
npm run preview
```

빌드 결과를 로컬에서 미리 확인합니다.

```bash
npm run lint
```

ESLint 검사를 실행합니다.

## GitHub Pages 배포

`vite.config.js`에는 GitHub Pages 프로젝트 사이트 경로에 맞춰 다음 base path가 설정되어 있습니다.

```js
base: "/yolov8-seg-page/"
```

GitHub Pages에서 Actions 배포를 사용하려면 저장소 설정에서 Pages source를 먼저 설정해야 합니다.

1. GitHub 저장소의 `Settings`로 이동
2. `Pages` 메뉴 선택
3. `Build and deployment`의 `Source`를 `GitHub Actions`로 변경
4. `main` 브랜치에 push하거나 Actions에서 workflow 수동 실행

배포 후 모델 파일도 사이트에서 접근 가능해야 합니다. 모델을 Git에 포함하지 않는 경우에는 Git LFS, release asset 다운로드, 별도 CDN, 또는 workflow에서 모델을 내려받는 방식 중 하나를 선택해야 합니다.

## 참고 사항

- 현재 모델 입력 크기는 `960 x 960`입니다.
- ONNX Runtime Web의 WASM 파일은 jsDelivr CDN에서 로드합니다.
- 브라우저에서 실행되므로 큰 이미지나 큰 모델을 사용할수록 초기 로딩과 추론 시간이 길어질 수 있습니다.
- 모델 output shape은 `[1, 37, anchors]` 형태를 기대합니다.
