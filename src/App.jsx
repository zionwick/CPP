import { useState, useRef, useCallback, useEffect } from 'react'
import ReactPlayer from 'react-player'

const SPEEDS     = [0.25, 0.5, 0.75, 1.0]
const SKIP_UNITS = [1, 2, 3, 5, 10]

const FONT_SIZES = [
  { size: 18, label: 'XS' },
  { size: 26, label: 'S' },
  { size: 30, label: 'M' },
  { size: 34, label: 'L' },
  { size: 40, label: 'XL' },
]

const HIGHLIGHTS = [
  { color: '#fef08a', bg: 'bg-yellow-200' },
  { color: '#86efac', bg: 'bg-green-300' },
  { color: '#f9a8d4', bg: 'bg-pink-300' },
  { color: '#67e8f9', bg: 'bg-cyan-300' },
]

const HISTORY_KEY = 'cp-history'
const LYRICS_KEY  = 'cp-lyrics'
const THEME_KEY   = 'cp-theme'

function formatTime(sec) {
  if (!sec || sec < 0) return '0:00'
  const totalSec = Math.floor(sec)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = (totalSec % 60).toString().padStart(2, '0')
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s}`
  return `${m}:${s}`
}

function formatDate(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7)  return `${days}일 전`
  return new Date(ts).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function readStorage(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
}

// ── 오디오 파일 판별 & react-player <audio> 강제 렌더링 ──
const AUDIO_EXT_RE = /\.(mp3|aac|flac|wav|ogg|m4a)$/i
// react-player의 내부 AUDIO_EXTENSIONS 정규식에 없는 확장자는 인식되는 확장자로 대체 힌트를 준다
const AUDIO_FRAGMENT_ALIAS = { ogg: 'oga', flac: 'mp3' }

function isAudioFileName(name = '') {
  return AUDIO_EXT_RE.test(name)
}

// blob URL 뒤에 #a.{ext} fragment를 붙여 react-player가 <audio> 태그로 렌더링하도록 힌트를 준다
function withAudioHint(rawUrl, name = '') {
  if (!rawUrl.startsWith('blob:')) return rawUrl
  if (/#a\.[a-z0-9]+$/i.test(rawUrl)) return rawUrl
  const match = name.match(/\.([a-zA-Z0-9]+)$/)
  const ext = match ? match[1].toLowerCase() : 'mp3'
  const hintExt = AUDIO_FRAGMENT_ALIAS[ext] || ext
  return `${rawUrl}#a.${hintExt}`
}

// 재생시간에 맞춰 5초~1시간 사이 적당한 눈금 간격을 고른다
const TICK_INTERVALS = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600]
function pickTickInterval(duration, maxTicks = 10) {
  if (!duration || duration <= 0) return 5
  for (const interval of TICK_INTERVALS) {
    if (duration / interval <= maxTicks) return interval
  }
  return TICK_INTERVALS[TICK_INTERVALS.length - 1]
}

function VDivider() {
  return <div className="w-px self-stretch shrink-0" style={{ background: 'var(--cp-border)' }} />
}

function HistoryRow({
  entry, isActive, onLoad, onStartEdit, onRemove,
  isEditing, editVal, onEditChange, onEditBlur, onEditKeyDown,
}) {
  return (
    <div
      onClick={onLoad}
      style={{
        borderLeft: `2px solid ${isActive ? 'var(--cp-accent)' : 'transparent'}`,
        background: isActive ? 'color-mix(in srgb, var(--cp-accent) 8%, transparent)' : 'transparent',
      }}
      className="group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors hover:bg-[var(--cp-panel-alt)]"
    >
      <span style={{ color: isActive ? 'var(--cp-accent)' : 'var(--cp-border)' }}
        className="text-xs shrink-0 group-hover:text-[var(--cp-text-muted)] transition-colors">
        {isActive ? '▶' : '○'}
      </span>
      {isEditing ? (
        <input
          autoFocus value={editVal} onChange={onEditChange}
          onFocus={e => e.target.select()} onBlur={onEditBlur} onKeyDown={onEditKeyDown}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 px-2 py-0.5 rounded text-sm text-[var(--cp-text)] focus:outline-none"
          style={{ background: 'var(--cp-panel-alt)', border: '1px solid var(--cp-accent)' }}
        />
      ) : (
        <span onDoubleClick={onStartEdit} title="더블클릭으로 제목 편집"
          className="flex-1 min-w-0 text-sm truncate transition-colors"
          style={{ color: isActive ? 'var(--cp-text)' : 'var(--cp-text-muted)' }}>
          {entry.title}
        </span>
      )}
      <span className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--cp-text-muted)' }}>
        {formatDate(entry.savedAt ?? entry.addedAt)}
      </span>
      <button onClick={onStartEdit} title="제목 편집"
        className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity px-0.5 hover:text-[var(--cp-text)]"
        style={{ color: 'var(--cp-text-muted)' }}>✏️</button>
      <button onClick={onRemove} title="삭제"
        className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity px-0.5 hover:text-red-400"
        style={{ color: 'var(--cp-text-muted)' }}>🗑</button>
    </div>
  )
}

const HELP_STEPS = [
  { icon: '🎵', text: '유튜브 URL 붙여넣기 또는 로컬 파일 선택' },
  { icon: '▶️', text: '재생 후 연습할 구간 찾기' },
  { icon: '🅐', text: 'A 버튼으로 반복 시작점 지정' },
  { icon: '🅑', text: 'B 버튼으로 반복 끝점 지정 → 자동 반복 시작' },
  { icon: '🐢', text: '속도 버튼으로 느리게 조절 (0.25x ~ 1.0x)' },
  { icon: '📝', text: '가사 패널에 가사 입력 후 형광펜으로 표시' },
]

function HelpModal({ onClose }) {
  const [dontShow, setDontShow] = useState(false)
  const handleClose = () => {
    if (dontShow) localStorage.setItem('cp-help-seen', '1')
    onClose()
  }
  return (
    <div onClick={handleClose} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--cp-panel)', borderRadius: '16px', padding: '28px 32px 24px',
        width: '100%', maxWidth: '480px',
        border: '1px solid color-mix(in srgb, var(--cp-accent) 25%, transparent)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: 'var(--cp-accent)', marginBottom: '4px', fontWeight: 600 }}>GUIDE</div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--cp-text)' }}>CopyPractice Player 사용법</h2>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)', fontSize: '20px', lineHeight: 1, padding: '2px 4px' }}>✕</button>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {HELP_STEPS.map(({ icon, text }, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                minWidth: '28px', height: '28px', borderRadius: '50%',
                background: 'color-mix(in srgb, var(--cp-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--cp-accent) 30%, transparent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'var(--cp-accent)', flexShrink: 0,
              }}>{i + 1}</span>
              <div style={{ paddingTop: '4px' }}>
                <span style={{ marginRight: '6px' }}>{icon}</span>
                <span style={{ fontSize: '14px', color: 'var(--cp-text)', lineHeight: 1.5 }}>{text}</span>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ height: '1px', background: 'color-mix(in srgb, var(--cp-text) 6%, transparent)', margin: '20px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)}
              style={{ accentColor: 'var(--cp-accent)', width: '14px', height: '14px', cursor: 'pointer' }} />
            <span style={{ fontSize: '12px', color: 'var(--cp-text-muted)' }}>다시 보지 않기</span>
          </label>
          <button onClick={handleClose} style={{
            padding: '8px 24px', borderRadius: '8px', border: 'none',
            background: 'var(--cp-accent)', color: 'var(--cp-accent-text)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>확인</button>
        </div>
      </div>
    </div>
  )
}

function SeekBar({ played, duration, pointA, pointB, onSeekStart, onSeekChange, onSeekEnd }) {
  const trackRef      = useRef(null)
  const [dragging, setDragging]   = useState(false)
  const [dragRatio, setDragRatio] = useState(null)

  const ratioFromEvent = useCallback((e) => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    if (rect.width <= 0) return 0
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  }, [])

  const handlePointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const ratio = ratioFromEvent(e)
    setDragging(true)
    setDragRatio(ratio)
    onSeekStart()
    onSeekChange(ratio)
  }
  const handlePointerMove = (e) => {
    if (!dragging) return
    const ratio = ratioFromEvent(e)
    setDragRatio(ratio)
    onSeekChange(ratio)
  }
  const endDrag = (e) => {
    if (!dragging) return
    const ratio = ratioFromEvent(e)
    setDragging(false)
    setDragRatio(null)
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
    onSeekEnd(ratio)
  }

  const displayRatio = dragging && dragRatio !== null ? dragRatio : played
  // h:mm:ss 라벨은 m:ss보다 넓어 겹치기 쉬우므로 눈금 개수를 적게 유지한다
  const interval = pickTickInterval(duration, 5)
  const ticks = []
  if (duration > 0) {
    for (let t = 0; t <= duration + 0.001; t += interval) ticks.push(t)
  }

  // 트랙 두께는 고정, 그 외 세로 여백은 최소한으로 압축 (데스크톱 컨트롤 패널도 세 줄이 모두 들어와야 함)
  const trackH   = 12
  const centerY  = 12
  const tickTop  = 20
  const abH      = 16
  const posLineH = 7
  const posTriB  = 5
  const containerH = 36
  const tickFont = 8

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative flex-1 select-none"
      style={{ height: `${containerH}px`, touchAction: 'none', cursor: 'pointer' }}
    >
      {/* 트랙 배경 (기존 4px의 3배 두께) */}
      <div className="absolute left-0 right-0 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ top: `${centerY}px`, height: `${trackH}px`, background: 'var(--cp-border)' }} />
      {/* 재생 진행 */}
      <div className="absolute left-0 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ top: `${centerY}px`, height: `${trackH}px`, width: `${displayRatio * 100}%`, background: 'var(--cp-accent)' }} />

      {/* 시간 눈금 */}
      {ticks.map(t => (
        <div key={t} className="absolute pointer-events-none"
          style={{ top: `${tickTop}px`, left: `${(t / duration) * 100}%`, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: '1px', height: '4px', background: 'color-mix(in srgb, var(--cp-border) 60%, var(--cp-text) 40%)', margin: '0 auto' }} />
          <span style={{ fontSize: `${tickFont}px`, color: 'color-mix(in srgb, var(--cp-text-muted) 50%, transparent)', whiteSpace: 'nowrap' }}>{formatTime(t)}</span>
        </div>
      ))}

      {/* A/B 구간 마커 */}
      {pointA !== null && duration > 0 && (
        <div className="absolute -translate-y-1/2 w-1.5 rounded-sm pointer-events-none"
          style={{ top: `${centerY}px`, height: `${abH}px`, left: `${(pointA / duration) * 100}%`, background: 'var(--cp-text-muted)' }} />
      )}
      {pointB !== null && duration > 0 && (
        <div className="absolute -translate-y-1/2 w-1.5 rounded-sm pointer-events-none"
          style={{ top: `${centerY}px`, height: `${abH}px`, left: `${(pointB / duration) * 100}%`, background: 'var(--cp-text-muted)', opacity: 0.6 }} />
      )}

      {/* 현재 위치 마커: ▽─│─△ (트랙 중앙을 향해 안쪽으로 수렴) */}
      <div className="absolute flex flex-col items-center pointer-events-none"
        style={{ top: `${centerY}px`, left: `${displayRatio * 100}%`, transform: 'translate(-50%, -50%)' }}>
        <div style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderTop: `${posTriB}px solid var(--cp-accent)`,
        }} />
        <div style={{ width: '2px', height: `${posLineH}px`, background: 'var(--cp-accent)' }} />
        <div style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderBottom: `${posTriB}px solid var(--cp-accent)`,
        }} />
      </div>
    </div>
  )
}

export default function App() {
  const playerRef    = useRef(null)
  const fileInputRef = useRef(null)
  const lyricsRef    = useRef(null)
  const lyricsRef2   = useRef(null)
  const ccClearedRef = useRef(false)
  const mediaAudioRef = useRef(null) // 백그라운드 재생용

  // ── 미디어 상태 ──
  const [url, setUrl]           = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [fileName, setFileName] = useState('')
  const [isAudioOnly, setIsAudioOnly] = useState(false) // 음원 파일 여부

  const [playing, setPlaying]             = useState(false)
  const [speed, setSpeed]                 = useState(1.0)
  const [volume, setVolume]               = useState(1)
  const [duration, setDuration]           = useState(0)
  const [played, setPlayed]               = useState(0)
  const [playedSeconds, setPlayedSeconds] = useState(0)
  const [seeking, setSeeking]             = useState(false)

  const [pointA, setPointA]           = useState(null)
  const [pointB, setPointB]           = useState(null)
  const [looping, setLooping]         = useState(false)
  const [loopAll, setLoopAll]         = useState(false) // 전체 반복
  const [skipSeconds, setSkipSeconds] = useState(5)

  // ── 모바일 영상 접기 ──
  const [videoCollapsed, setVideoCollapsed] = useState(false)

  // ── 영상 기록 ──
  const [history, setHistory]             = useState(() => readStorage(HISTORY_KEY))
  const [showHistory, setShowHistory]     = useState(() => window.innerWidth >= 768)
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [editVideoId, setEditVideoId]     = useState(null)
  const [editVideoTitle, setEditVideoTitle] = useState('')

  // ── 가사 상태 ──
  const [fontSize, setFontSize]               = useState(30)
  const [activeHighlight, setActiveHighlight] = useState(HIGHLIGHTS[0].color)
  const [lyricsLib, setLyricsLib]           = useState(() => readStorage(LYRICS_KEY))
  const [showLyricsLib, setShowLyricsLib]   = useState(true)
  const [showSaveForm, setShowSaveForm]     = useState(false)
  const [saveTitle, setSaveTitle]           = useState('')
  const [activeLyricsId, setActiveLyricsId] = useState(null)
  const [editLyricsId, setEditLyricsId]     = useState(null)
  const [editLyricsTitle, setEditLyricsTitle] = useState('')
  const [activePanel, setActivePanel]       = useState(1)
  const [viewMode, setViewMode]             = useState(() => window.innerWidth < 768 ? 'mobile' : 'desktop')
  const [lyricsView, setLyricsView]         = useState(() => window.innerWidth < 768 ? 'A' : 'AB')
  const [showHelp, setShowHelp]             = useState(() => !localStorage.getItem('cp-help-seen'))

  // ── 테마 (다크 / 웜) ──
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const switchLyricsView = (v) => {
    setLyricsView(v)
    if (v === 'A') setActivePanel(1)
    if (v === 'B') setActivePanel(2)
  }

  // ── 미디어 세션 API (백그라운드/잠금화면 컨트롤) ──
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    if (!url) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: fileName || 'CopyPractice Player',
      artist: 'CPP',
      album: 'cpplay.org',
      artwork: [{ src: '/og-image.png', sizes: '1200x630', type: 'image/png' }]
    })

    navigator.mediaSession.setActionHandler('play', () => setPlaying(true))
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false))
    navigator.mediaSession.setActionHandler('seekbackward', () => {
      if (playerRef.current) playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - skipSeconds)
    })
    navigator.mediaSession.setActionHandler('seekforward', () => {
      if (playerRef.current) playerRef.current.currentTime = Math.min(playerRef.current.duration || 0, playerRef.current.currentTime + skipSeconds)
    })

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('seekbackward', null)
      navigator.mediaSession.setActionHandler('seekforward', null)
    }
  }, [url, fileName, skipSeconds])

  // 재생 상태 미디어세션 동기화
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }, [playing])

  // ── localStorage 헬퍼 ──
  const persistHistory = (entries) => {
    setHistory(entries)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  }
  const persistLyricsLib = (entries) => {
    setLyricsLib(entries)
    localStorage.setItem(LYRICS_KEY, JSON.stringify(entries))
  }

  // ── 영상 기록 함수 ──
  const addToHistory = (newUrl, defaultTitle, isAudio = false) => {
    setHistory(prev => {
      const existing = prev.find(e => e.url === newUrl)
      let updated
      if (existing) {
        updated = [{ ...existing, addedAt: Date.now(), isAudio }, ...prev.filter(e => e.url !== newUrl)]
        setActiveVideoId(existing.id)
      } else {
        const entry = { id: crypto.randomUUID(), url: newUrl, title: defaultTitle, addedAt: Date.now(), isAudio }
        updated = [entry, ...prev]
        setActiveVideoId(entry.id)
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const removeVideo = (id, e) => {
    e.stopPropagation()
    persistHistory(history.filter(h => h.id !== id))
    if (activeVideoId === id) setActiveVideoId(null)
  }

  const startEditVideo = (entry, e) => {
    e.stopPropagation()
    setEditVideoId(entry.id)
    setEditVideoTitle(entry.title)
  }

  const commitEditVideo = () => {
    if (!editVideoId) return
    const t = editVideoTitle.trim()
    if (t) persistHistory(history.map(h => h.id === editVideoId ? { ...h, title: t } : h))
    setEditVideoId(null)
  }

  const loadFromHistory = (entry) => {
    if (editVideoId) return
    loadUrl(entry.url, entry.title, entry.isAudio)
    setActiveVideoId(entry.id)
    persistHistory([{ ...entry, addedAt: Date.now() }, ...history.filter(h => h.id !== entry.id)])
  }

  // ── 미디어 로드 ──
  const disableYouTubeCaptions = (el) => {
    try { el?.api?.setOption('captions', 'track', {}) } catch {}
  }

  const loadUrl = (newUrl, name = '', explicitIsAudio) => {
    // 음원 파일 여부 판단: 실제 파일명(name)의 확장자 기준 (blob URL 자체는 확장자 정보가 없음)
    const isAudio = explicitIsAudio !== undefined ? explicitIsAudio : isAudioFileName(name)
    // 로컬 오디오 파일이면 <audio> 태그로 렌더링되도록 blob URL에 힌트 fragment를 붙인다
    const finalUrl = isAudio ? withAudioHint(newUrl, name) : newUrl
    setUrl(finalUrl)
    setFileName(name)
    setIsAudioOnly(isAudio)
    if (isAudio) setVideoCollapsed(true) // 음원이면 자동 접기
    setPlaying(true)
    setPlayed(0)
    setPlayedSeconds(0)
    setDuration(0)
    setPointA(null)
    setPointB(null)
    setLooping(false)
    ccClearedRef.current = false
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    const isAudio = isAudioFileName(file.name)
    loadUrl(objectUrl, file.name, isAudio)
    addToHistory(objectUrl, file.name, isAudio)
    e.target.value = ''
  }

  const handleYouTubeSubmit = (e) => {
    e.preventDefault()
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setVideoCollapsed(false)
    loadUrl(trimmed, '', false)
    addToHistory(trimmed, 'YouTube 영상', false)
  }

  // ── 가사 패널 헬퍼 ──
  const getActiveLyricsRef = () => activePanel === 2 ? lyricsRef2 : lyricsRef

  const handleSaveLyrics = () => {
    const ref = getActiveLyricsRef()
    const textContent = ref.current?.textContent?.trim()
    if (!textContent) return
    const content = ref.current.innerHTML
    const title   = saveTitle.trim() || '제목 없음'
    const entry   = { id: crypto.randomUUID(), title, content, savedAt: Date.now() }
    persistLyricsLib([entry, ...lyricsLib])
    setActiveLyricsId(entry.id)
    setShowSaveForm(false)
    setSaveTitle('')
    setShowLyricsLib(true)
  }

  const loadLyricsEntry = (entry) => {
    if (editLyricsId) return
    const ref = getActiveLyricsRef()
    if (ref.current) ref.current.innerHTML = entry.content
    setActiveLyricsId(entry.id)
  }

  const removeLyrics = (id, e) => {
    e.stopPropagation()
    persistLyricsLib(lyricsLib.filter(l => l.id !== id))
    if (activeLyricsId === id) setActiveLyricsId(null)
  }

  const startEditLyrics = (entry, e) => {
    e.stopPropagation()
    setEditLyricsId(entry.id)
    setEditLyricsTitle(entry.title)
  }

  const commitEditLyrics = () => {
    if (!editLyricsId) return
    const t = editLyricsTitle.trim()
    if (t) persistLyricsLib(lyricsLib.map(l => l.id === editLyricsId ? { ...l, title: t } : l))
    setEditLyricsId(null)
  }

  // ── 형광펜 ──
  const applyHighlight = (color) => {
    document.execCommand('backColor', false, color)
    document.execCommand('foreColor', false, '#000000')
    getActiveLyricsRef().current?.focus()
  }
  const removeHighlight = () => {
    document.execCommand('backColor', false, 'transparent')
    document.execCommand('foreColor', false, 'var(--cp-text)')
    getActiveLyricsRef().current?.focus()
  }
  const clearLyrics = () => {
    const ref = getActiveLyricsRef()
    if (ref.current) ref.current.innerHTML = ''
    setActiveLyricsId(null)
  }

  // ── 전역 키보드 ──
  useEffect(() => {
    if (!url) return
    const handler = (e) => {
      const el  = document.activeElement
      const tag = el?.tagName?.toUpperCase()
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || el?.contentEditable === 'true'
      if (e.code === 'Space') {
        if (isEditable) return
        e.preventDefault()
        setPlaying(p => !p)
        return
      }
      if (isEditable) return
      if (e.code === 'ArrowLeft') {
        e.preventDefault()
        if (playerRef.current) playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - skipSeconds)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        if (playerRef.current) playerRef.current.currentTime = Math.min(playerRef.current.duration || 0, playerRef.current.currentTime + skipSeconds)
      } else if (e.code === 'ArrowUp') {
        e.preventDefault()
        setVolume(v => Math.min(1, Math.round((v + 0.1) * 10) / 10))
      } else if (e.code === 'ArrowDown') {
        e.preventDefault()
        setVolume(v => Math.max(0, Math.round((v - 0.1) * 10) / 10))
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [url, skipSeconds])

  // ── 재생 이벤트 ──
  const handleTimeUpdate = useCallback((e) => {
    const ps  = e.target.currentTime
    const dur = e.target.duration || 0
    if (!seeking) {
      setPlayed(dur > 0 ? ps / dur : 0)
      setPlayedSeconds(ps)
    }
    if (looping && pointA !== null && pointB !== null && ps >= pointB)
      e.target.currentTime = pointA
    if (!ccClearedRef.current && e.target.api) {
      disableYouTubeCaptions(e.target)
      ccClearedRef.current = true
    }
  }, [seeking, looping, pointA, pointB])

  const handleDurationChange = (e) => {
    setDuration(e.target.duration)
    disableYouTubeCaptions(e.target)
  }

  const handleEnded = useCallback(() => {
    if (looping && pointA !== null) {
      if (playerRef.current) playerRef.current.currentTime = pointA
      setPlaying(true)
    } else if (loopAll) {
      // 전체 반복: 처음으로
      if (playerRef.current) playerRef.current.currentTime = 0
      setPlaying(true)
    } else {
      setPlaying(false)
    }
  }, [looping, pointA, loopAll])

  // ── 재생/일시정지 버그 수정: onPlay/onPause로 실제 상태 동기화 ──
  const handlePlay  = () => setPlaying(true)
  const handlePause = () => setPlaying(false)

  // ── 시크바 ──
  const handleSeekStart  = () => setSeeking(true)
  const handleSeekChange = (ratio) => setPlayed(ratio)
  const handleSeekEnd    = (ratio) => {
    setSeeking(false)
    if (playerRef.current)
      playerRef.current.currentTime = ratio * duration
  }
  const skip = (sec) => {
    if (!playerRef.current) return
    playerRef.current.currentTime = Math.max(0, Math.min(playerRef.current.duration || 0, playerRef.current.currentTime + sec))
  }

  // ── A-B 반복 ──
  const handleSetA = () => setPointA(playedSeconds)
  const handleSetB = () => setPointB(playedSeconds)
  const handleToggleLoop = () => {
    if (!looping && pointA !== null && pointB !== null)
      if (playerRef.current) playerRef.current.currentTime = pointA
    setLooping(p => !p)
  }
  const handleClearAB = () => { setPointA(null); setPointB(null); setLooping(false) }
  const canLoop = pointA !== null && pointB !== null && pointA < pointB

  const volPct = Math.round(volume * 100)

  // ── 스타일 헬퍼 ──
  const speedBtn = (active) => ({
    padding: viewMode === 'mobile' ? '4px 10px' : '3px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)' : 'var(--cp-panel-alt)',
    color: active ? 'var(--cp-accent)' : 'var(--cp-text-muted)',
    boxShadow: active ? 'inset 0 0 0 1px var(--cp-accent)' : 'none',
  })
  const skipUnitBtn = (active) => ({
    padding: viewMode === 'mobile' ? '4px 8px' : '3px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)' : 'var(--cp-panel-alt)',
    color: active ? 'var(--cp-accent)' : 'var(--cp-text-muted)',
    boxShadow: active ? 'inset 0 0 0 1px var(--cp-accent)' : 'none',
  })
  const abBtn = (active) => ({
    padding: viewMode === 'mobile' ? '4px 12px' : '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    fontFamily: 'monospace', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'color-mix(in srgb, var(--cp-text-muted) 18%, transparent)' : 'var(--cp-panel-alt)',
    color: 'var(--cp-text-muted)',
    boxShadow: active ? 'inset 0 0 0 1px color-mix(in srgb, var(--cp-text-muted) 60%, transparent)' : 'none',
  })

  return (
    <div style={{ background: 'var(--cp-bg)' }} className="h-screen text-[var(--cp-text)] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center px-4 py-3" style={{ borderBottom: '1px solid var(--cp-border)' }}>
        <div className="flex-1 flex items-center gap-3">
          <span style={{ fontSize: '11px', color: theme === 'dark' ? 'var(--cp-accent)' : 'var(--cp-text-muted)' }}>다크</span>
          <button onClick={() => setTheme(t => t === 'dark' ? 'warm' : 'dark')} title="테마 전환" style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: theme === 'warm' ? 'var(--cp-accent)' : 'var(--cp-border)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: '2px',
              left: theme === 'warm' ? '22px' : '2px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'var(--cp-text)', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '11px', color: theme === 'warm' ? 'var(--cp-accent)' : 'var(--cp-text-muted)' }}>웜</span>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.3em', color: 'var(--cp-accent)', lineHeight: 1 }}>CPP</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'var(--cp-text-muted)', fontWeight: 400 }}>COPYPRACTICE PLAYER</span>
        </div>
        <div className="flex-1 flex justify-end items-center gap-3">
          <button onClick={() => setShowHelp(true)} title="사용법 보기" style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: '1px solid var(--cp-border)', background: 'var(--cp-panel-alt)',
            color: 'var(--cp-text-muted)', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>?</button>
          <span style={{ fontSize: '11px', color: viewMode === 'desktop' ? 'var(--cp-accent)' : 'var(--cp-text-muted)' }}>PC</span>
          <button onClick={() => setViewMode(m => m === 'desktop' ? 'mobile' : 'desktop')} style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: viewMode === 'mobile' ? 'var(--cp-accent)' : 'var(--cp-border)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: '2px',
              left: viewMode === 'mobile' ? '22px' : '2px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: 'var(--cp-text)', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '11px', color: viewMode === 'mobile' ? 'var(--cp-accent)' : 'var(--cp-text-muted)' }}>모바일</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className={viewMode === 'mobile'
        ? 'flex-1 flex flex-col overflow-y-auto overscroll-contain'
        : 'flex flex-1 overflow-hidden flex-row'}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >

        {/* ══ LEFT — Player ══ */}
        <div className={`min-w-0 flex flex-col ${viewMode === 'mobile' ? 'w-full sticky top-0 z-10 shrink-0' : 'flex-1 overflow-hidden'}`}
          style={viewMode === 'mobile' ? { background: 'var(--cp-bg)' } : undefined}>

          {/* URL / File 입력 */}
          <div className={`shrink-0 flex gap-1.5 items-center ${viewMode === 'mobile' ? 'flex-nowrap px-2 py-1' : 'flex-wrap px-4 py-2.5'}`}
            style={{ borderBottom: '1px solid var(--cp-border)' }}>
            <button onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1 rounded-lg transition-colors shrink-0 ${viewMode === 'mobile' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
              style={{ background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)', border: '1px solid var(--cp-border)' }}>
              📂{viewMode !== 'mobile' && <span>로컬 파일</span>}
            </button>
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} />
            {fileName && (
              <span className="text-xs truncate max-w-24 shrink-0" style={{ color: 'var(--cp-text-muted)' }} title={fileName}>{fileName}</span>
            )}
            <form onSubmit={handleYouTubeSubmit} className="flex gap-1.5 flex-1 min-w-0">
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder={viewMode === 'mobile' ? 'YouTube URL...' : 'YouTube URL 붙여넣기...'}
                className={`flex-1 min-w-0 rounded-lg focus:outline-none transition-colors ${viewMode === 'mobile' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
                style={{ background: 'var(--cp-panel-alt)', border: '1px solid var(--cp-border)', color: 'var(--cp-text)' }}
              />
              <button type="submit"
                className={`flex items-center gap-1 rounded-lg font-medium transition-colors shrink-0 ${viewMode === 'mobile' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}`}
                style={{ background: 'var(--cp-accent)', color: 'var(--cp-accent-text)' }}>
                ▶{viewMode !== 'mobile' && ' 재생'}
              </button>
            </form>
          </div>

          {/* 영상 기록 */}
          <div className="shrink-0" style={{ borderBottom: '1px solid var(--cp-border)' }}>
            <button onClick={() => setShowHistory(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
              style={{ color: 'var(--cp-text-muted)' }}>
              <span className="text-xs font-medium">🕐 영상 기록</span>
              {history.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)' }}>
                  {history.length}
                </span>
              )}
              <span className="ml-auto text-xs">{showHistory ? '▲' : '▼'}</span>
            </button>
            {showHistory && (
              <div className="max-h-44 overflow-y-auto">
                {history.length === 0
                  ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--cp-border)' }}>아직 기록이 없습니다.</p>
                  : history.map(entry => (
                    <HistoryRow key={entry.id} entry={entry}
                      isActive={activeVideoId === entry.id}
                      onLoad={() => loadFromHistory(entry)}
                      onStartEdit={(e) => startEditVideo(entry, e)}
                      onRemove={(e) => removeVideo(entry.id, e)}
                      isEditing={editVideoId === entry.id}
                      editVal={editVideoTitle}
                      onEditChange={e => setEditVideoTitle(e.target.value)}
                      onEditBlur={commitEditVideo}
                      onEditKeyDown={e => {
                        if (e.key === 'Enter') commitEditVideo()
                        if (e.key === 'Escape') setEditVideoId(null)
                      }}
                    />
                  ))
                }
              </div>
            )}
          </div>

          {/* 영상 플레이어 — 모바일에서 접기/펼치기 */}
          {viewMode === 'mobile' && url && (
            <button
              onClick={() => setVideoCollapsed(p => !p)}
              className="w-full flex items-center justify-between px-4 py-1.5 text-xs"
              style={{ background: 'var(--cp-panel)', color: 'var(--cp-text-muted)', borderBottom: '1px solid var(--cp-border)', border: 'none', cursor: 'pointer' }}
            >
              <span>{isAudioOnly ? '🎵 음원 재생 중' : '🎬 영상'}</span>
              <span>{videoCollapsed ? '▼ 펼치기' : '▲ 접기'}</span>
            </button>
          )}

          <div className={`bg-black relative ${
            viewMode === 'mobile'
              ? videoCollapsed ? 'hidden' : 'aspect-video'
              : 'flex-[4] min-h-0'
          }`}>
            {url ? (
              <>
                <ReactPlayer
                  ref={playerRef} src={url}
                  playing={playing} playbackRate={speed} volume={volume}
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={handleDurationChange}
                  onEnded={handleEnded}
                  onPlay={handlePlay}
                  onPause={handlePause}
                  width="100%" height="100%"
                  config={{ youtube: { cc_load_policy: 0 } }}
                />
                <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setPlaying(p => !p)} />
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--cp-border)' }}>
                <span className="text-5xl">♪</span>
                <p className="text-sm" style={{ color: 'var(--cp-text-muted)' }}>파일 업로드 또는 YouTube URL 입력</p>
              </div>
            )}
          </div>

          {/* 컨트롤 패널 — 항상 내용물 높이만큼만 차지(shrink-0), 영상 영역(flex-[4] min-h-0)이 남는 공간을 흡수 */}
          <div className="px-3 py-2 flex flex-col shrink-0 gap-1.5"
            style={{ background: 'var(--cp-panel)', borderTop: '1px solid var(--cp-border)' }}>

            {/* 시크바 */}
            <div className="flex items-center gap-2 text-xs font-mono shrink-0" style={{ color: 'var(--cp-text-muted)' }}>
              <span className="w-11 text-right shrink-0">{formatTime(playedSeconds)}</span>
              <SeekBar
                played={played} duration={duration}
                pointA={pointA} pointB={pointB}
                onSeekStart={handleSeekStart}
                onSeekChange={handleSeekChange}
                onSeekEnd={handleSeekEnd}
              />
              <span className="w-11 shrink-0">{formatTime(duration)}</span>
            </div>

            {/* 재생 · 속도 · 스킵 · 볼륨 — 모바일은 한 줄 유지+가로 스크롤, 데스크톱은 자연스럽게 줄바꿈(가로 스크롤바 없음) + 최대한 압축 */}
            <div className={`flex items-center shrink-0 ${viewMode === 'mobile' ? 'flex-nowrap overflow-x-auto gap-1.5' : 'flex-wrap gap-1.5'}`}>
              {/* 재생/일시정지 */}
              <button
                onClick={() => setPlaying(p => !p)} disabled={!url}
                className={`rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 ${viewMode === 'mobile' ? 'w-10 h-10 text-lg' : 'w-9 h-9 text-lg'}`}
                style={{ background: 'var(--cp-accent)', color: 'var(--cp-accent-text)' }}
              >{playing ? '⏸' : '▶'}</button>

              {/* 전체 반복 버튼 */}
              <button
                onClick={() => setLoopAll(p => !p)} disabled={!url}
                title="전체 반복"
                className={`rounded-full flex items-center justify-center transition-all disabled:opacity-30 shrink-0 ${viewMode === 'mobile' ? 'w-8 h-8 text-xs' : 'w-7 h-7 text-xs'}`}
                style={{
                  background: loopAll ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)' : 'var(--cp-panel-alt)',
                  color: loopAll ? 'var(--cp-accent)' : 'var(--cp-text-muted)',
                  border: loopAll ? '1px solid var(--cp-accent)' : '1px solid var(--cp-border)',
                  cursor: 'pointer',
                }}
              >🔁</button>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: 'var(--cp-text-muted)' }}>속도</span>
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => setSpeed(s)} style={speedBtn(speed === s)}>{s}x</button>
                ))}
              </div>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: 'var(--cp-text-muted)' }}>스킵</span>
                <button onClick={() => skip(-skipSeconds)} disabled={!url}
                  className={`rounded text-sm transition-colors disabled:opacity-30 ${viewMode === 'mobile' ? 'px-2.5 min-h-[38px]' : 'px-2 py-0.5'}`}
                  style={{ background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)', border: 'none', cursor: 'pointer' }}>◀◀</button>
                <button onClick={() => skip(skipSeconds)} disabled={!url}
                  className={`rounded text-sm transition-colors disabled:opacity-30 ${viewMode === 'mobile' ? 'px-2.5 min-h-[38px]' : 'px-2 py-0.5'}`}
                  style={{ background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)', border: 'none', cursor: 'pointer' }}>▶▶</button>
                <div className="flex gap-1 ml-1">
                  {SKIP_UNITS.map(u => (
                    <button key={u} onClick={() => setSkipSeconds(u)} style={skipUnitBtn(skipSeconds === u)}>{u}s</button>
                  ))}
                </div>
              </div>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0 text-xs" style={{ color: 'var(--cp-text-muted)' }}>
                <span>{volPct === 0 ? '🔇' : volPct < 50 ? '🔉' : '🔊'}</span>
                <span className="font-mono w-8">{volPct}%</span>
              </div>
            </div>

            {/* A-B 반복 — 모바일은 한 줄 유지+가로 스크롤, 데스크톱은 자연스럽게 줄바꿈(가로 스크롤바 없음) */}
            <div className={`flex items-center gap-1.5 shrink-0 ${viewMode === 'mobile' ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'}`}>
              <span className="text-xs font-medium shrink-0" style={{ color: 'var(--cp-text-muted)' }}>🔂 구간 반복</span>
              <button onClick={handleSetA} disabled={!url}
                className={viewMode === 'mobile' ? 'min-h-[38px]' : ''}
                style={{ ...abBtn(pointA !== null), opacity: !url ? 0.3 : 1 }}>
                ⬇ A {pointA !== null ? formatTime(pointA) : '시작'}
              </button>
              <button onClick={handleSetB} disabled={!url}
                className={viewMode === 'mobile' ? 'min-h-[38px]' : ''}
                style={{ ...abBtn(pointB !== null), opacity: !url ? 0.3 : 1 }}>
                ⬆ B {pointB !== null ? formatTime(pointB) : '끝'}
              </button>
              <button onClick={handleToggleLoop} disabled={!canLoop}
                className={viewMode === 'mobile' ? 'min-h-[38px]' : ''}
                style={{
                  padding: viewMode === 'mobile' ? '4px 12px' : '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                  border: 'none', cursor: canLoop ? 'pointer' : 'not-allowed',
                  opacity: !canLoop ? 0.3 : 1,
                  background: looping ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)' : 'var(--cp-panel-alt)',
                  color: looping ? 'var(--cp-accent)' : 'var(--cp-text-muted)',
                  boxShadow: looping ? 'inset 0 0 0 1px var(--cp-accent)' : 'none',
                }}
              >{looping ? '🔁 반복 중' : '↩ 반복'}</button>
              <button onClick={handleClearAB} disabled={pointA === null && pointB === null}
                className={viewMode === 'mobile' ? 'min-h-[38px]' : ''}
                style={{
                  padding: viewMode === 'mobile' ? '4px 10px' : '3px 8px', borderRadius: '6px', fontSize: '11px',
                  border: 'none', cursor: 'pointer',
                  background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)',
                  opacity: pointA === null && pointB === null ? 0.3 : 1,
                }}>✕</button>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — 가사 패널 ══ */}
        <div className={`min-w-0 flex flex-col ${viewMode === 'mobile' ? 'border-t' : 'flex-1 border-l'} border-[var(--cp-border)]`}>
          {/* 가사 툴바 */}
          <div className="shrink-0 px-4 py-2.5 flex items-center gap-3 flex-wrap"
            style={{ borderBottom: '1px solid var(--cp-border)', background: 'var(--cp-panel)' }}>
            <span className="text-xs font-medium shrink-0" style={{ color: 'var(--cp-text-muted)' }}>LYRICS</span>
            <VDivider />
            <div className="flex items-center gap-1 shrink-0">
              {FONT_SIZES.map(({ size, label }) => (
                <button key={size} onClick={() => setFontSize(size)} style={{
                  padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: fontSize === size ? 'var(--cp-border)' : 'transparent',
                  color: fontSize === size ? 'var(--cp-text)' : 'var(--cp-text-muted)',
                }}>{label}</button>
              ))}
            </div>
            <VDivider />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs" style={{ color: 'var(--cp-text-muted)' }}>형광</span>
              {HIGHLIGHTS.map(({ color, bg }) => (
                <button key={color}
                  onMouseDown={e => { e.preventDefault(); setActiveHighlight(color); applyHighlight(color) }}
                  className={`w-5 h-5 rounded-full ${bg} hover:scale-110 transition-transform`}
                  style={activeHighlight === color ? { outline: '2px solid var(--cp-text)', outlineOffset: '2px' } : {}}
                />
              ))}
              <button onMouseDown={e => { e.preventDefault(); removeHighlight() }} style={{
                padding: '2px 8px', borderRadius: '5px', fontSize: '11px',
                border: '1px solid var(--cp-border)', cursor: 'pointer',
                background: 'transparent', color: 'var(--cp-text-muted)',
              }}>제거</button>
            </div>
            <VDivider />
            <button onClick={() => { setShowSaveForm(p => !p); setSaveTitle('') }} style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: showSaveForm ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)' : 'var(--cp-panel-alt)',
              color: showSaveForm ? 'var(--cp-accent)' : 'var(--cp-text-muted)',
              boxShadow: showSaveForm ? 'inset 0 0 0 1px var(--cp-accent)' : 'none',
            }}>💾 저장</button>
            <div className="ml-auto flex items-center gap-2">
              {[{ key: 'A', label: 'A' }, { key: 'AB', label: 'A│B' }, { key: 'B', label: 'B' }].map(({ key, label }) => (
                <button key={key} onClick={() => switchLyricsView(key)}
                  className="min-h-[44px] md:min-h-[28px]"
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: lyricsView === key ? 'color-mix(in srgb, var(--cp-accent) 18%, transparent)' : 'var(--cp-panel-alt)',
                    color: lyricsView === key ? 'var(--cp-accent)' : 'var(--cp-text-muted)',
                    boxShadow: lyricsView === key ? 'inset 0 0 0 1px var(--cp-accent)' : 'none',
                  }}>{label}</button>
              ))}
              <div style={{ width: '1px', height: '16px', background: 'var(--cp-border)', flexShrink: 0 }} />
              <button onClick={clearLyrics} style={{
                fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cp-text-muted)',
              }}>지우기</button>
            </div>
          </div>

          {/* 저장 폼 */}
          {showSaveForm && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5"
              style={{ background: 'var(--cp-panel)', borderBottom: '1px solid var(--cp-border)' }}>
              <span className="text-xs shrink-0" style={{ color: 'var(--cp-text-muted)' }}>제목</span>
              <input autoFocus value={saveTitle} onChange={e => setSaveTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveLyrics()
                  if (e.key === 'Escape') setShowSaveForm(false)
                }}
                placeholder="가사 제목을 입력하세요..."
                className="flex-1 px-3 py-1.5 rounded text-sm focus:outline-none"
                style={{ background: 'var(--cp-panel-alt)', border: '1px solid var(--cp-border)', color: 'var(--cp-text)' }}
              />
              <button onClick={handleSaveLyrics}
                className="px-3 py-1.5 rounded text-sm font-medium shrink-0"
                style={{ background: 'var(--cp-accent)', color: 'var(--cp-accent-text)', border: 'none', cursor: 'pointer' }}>저장</button>
              <button onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 rounded text-sm shrink-0"
                style={{ background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)', border: 'none', cursor: 'pointer' }}>취소</button>
            </div>
          )}

          {/* 가사 라이브러리 */}
          <div className="shrink-0" style={{ borderBottom: '1px solid var(--cp-border)' }}>
            <button onClick={() => setShowLyricsLib(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left"
              style={{ color: 'var(--cp-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="text-xs font-medium">📚 저장된 가사</span>
              {lyricsLib.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--cp-panel-alt)', color: 'var(--cp-text-muted)' }}>
                  {lyricsLib.length}
                </span>
              )}
              <span className="ml-auto text-xs">{showLyricsLib ? '▲' : '▼'}</span>
            </button>
            {showLyricsLib && (
              <div className="max-h-44 overflow-y-auto">
                {lyricsLib.length === 0
                  ? <p className="px-4 py-3 text-xs" style={{ color: 'var(--cp-border)' }}>저장된 가사가 없습니다.</p>
                  : lyricsLib.map(entry => (
                    <HistoryRow key={entry.id} entry={entry}
                      isActive={activeLyricsId === entry.id}
                      onLoad={() => loadLyricsEntry(entry)}
                      onStartEdit={(e) => startEditLyrics(entry, e)}
                      onRemove={(e) => removeLyrics(entry.id, e)}
                      isEditing={editLyricsId === entry.id}
                      editVal={editLyricsTitle}
                      onEditChange={e => setEditLyricsTitle(e.target.value)}
                      onEditBlur={commitEditLyrics}
                      onEditKeyDown={e => {
                        if (e.key === 'Enter') commitEditLyrics()
                        if (e.key === 'Escape') setEditLyricsId(null)
                      }}
                    />
                  ))
                }
              </div>
            )}
          </div>

          {/* 가사 편집 영역 */}
          <div className={viewMode === 'mobile' ? 'flex' : 'flex-1 flex overflow-hidden'}>
            <div ref={lyricsRef} contentEditable suppressContentEditableWarning spellCheck={false}
              onFocus={() => setActivePanel(1)}
              data-placeholder={'A 패널\n\n가사를 붙여넣거나 직접 입력하세요.'}
              style={{
                display: lyricsView === 'B' ? 'none' : 'block',
                fontSize: `${fontSize}px`,
                background: activePanel === 1 ? 'color-mix(in srgb, var(--cp-accent) 3%, transparent)' : 'var(--cp-bg)',
                borderRight: lyricsView === 'AB' ? `1px solid ${activePanel === 1 ? 'color-mix(in srgb, var(--cp-accent) 20%, transparent)' : 'var(--cp-border)'}` : 'none',
                minHeight: viewMode === 'mobile' ? '60vh' : undefined,
              }}
              className={`flex-1 p-5 text-[var(--cp-text)] leading-relaxed focus:outline-none ${viewMode === 'mobile' ? '' : 'overflow-y-auto'}`}
            />
            <div ref={lyricsRef2} contentEditable suppressContentEditableWarning spellCheck={false}
              onFocus={() => setActivePanel(2)}
              data-placeholder={'B 패널\n\n가사를 붙여넣거나 직접 입력하세요.'}
              style={{
                display: lyricsView === 'A' ? 'none' : 'block',
                fontSize: `${fontSize}px`,
                background: activePanel === 2 ? 'color-mix(in srgb, var(--cp-accent) 3%, transparent)' : 'var(--cp-bg)',
                minHeight: viewMode === 'mobile' ? '60vh' : undefined,
              }}
              className={`flex-1 p-5 text-[var(--cp-text)] leading-relaxed focus:outline-none ${viewMode === 'mobile' ? '' : 'overflow-y-auto'}`}
            />
          </div>
        </div>
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
                       }
