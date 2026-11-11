// 화면 언어 상태 저장소.
// - 사용자가 언어 버튼으로 직접 고른 값만 localStorage에 저장한다.
//   (예전 키 cp-language는 첫 방문 때 'ko'가 자동 저장돼 브라우저 언어 감지를 막으므로 새 키를 쓴다)
// - 저장된 선택이 없으면 브라우저 언어로 결정: 한국어면 ko, 그 외는 en
// - 프리렌더(SSR) 결과는 한국어라 서버 스냅샷은 'ko'로 고정해 hydration 불일치를 막는다.
const LANGUAGE_KEY = 'cp-language-choice'
const listeners = new Set()
let memoryChoice = null // localStorage를 쓸 수 없는 환경(사생활 보호 모드 등) 대비

function readChoice() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    if (saved === 'ko' || saved === 'en') return saved
  } catch { /* 저장소 접근 불가 */ }
  return memoryChoice
}

export function getLanguageSnapshot() {
  const choice = readChoice()
  if (choice) return choice
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ko']
  return String(langs[0]).toLowerCase().startsWith('ko') ? 'ko' : 'en'
}

export const getServerLanguageSnapshot = () => 'ko'

export function subscribeLanguage(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function chooseLanguage(value) {
  memoryChoice = value
  try { localStorage.setItem(LANGUAGE_KEY, value) } catch { /* 무시 */ }
  listeners.forEach((l) => l())
}
