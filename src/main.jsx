import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageProvider.jsx'

const rootEl = document.getElementById('root')
const app = (
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
)

// 빌드 타임 프리렌더 스크립트(scripts/prerender.mjs)가 채워둔 정적 마크업이 있으면
// hydrateRoot로 이어받고, 개발 서버 등 비어있는 root라면 기존처럼 createRoot로 렌더
if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app)
} else {
  createRoot(rootEl).render(app)
}
