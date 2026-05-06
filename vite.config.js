import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// COOP/COEP 헤더: SharedArrayBuffer 활성화 → ort.env.wasm.numThreads 효과 발휘
const crossOriginHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react()],
  base: '/yolov8-seg-page/',
  server: { headers: crossOriginHeaders },
  preview: { headers: crossOriginHeaders },
})