import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { applyTheme, loadThemePreference } from './data/persistence'
import { applyBackdropDetection } from './utils/backdrop'
import './index.css'

// 渲染前同步应用主题，避免首帧闪烁
applyTheme(loadThemePreference())
// 检测 backdrop-filter 真实支持度，驱动导航栏双态材质
applyBackdropDetection()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
