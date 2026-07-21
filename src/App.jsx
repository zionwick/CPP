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

function formatTime(sec) {
  if (!sec || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
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
function pickTickInterval(duration) {
  if (!duration || duration <= 0) return 5
  const maxTicks = 10
  for (const interval of TICK_INTERVALS) {
    if (duration / interval <= maxTicks) return interval
  }
  return TICK_INTERVALS[TICK_INTERVALS.length - 1]
}

function VDivider() {
  return <div className="w-px self-stretch shrink-0" style={{ background: '#2d2d3e' }} />
}

function HistoryRow({
  entry, isActive, onLoad, onStartEdit, onRemove,
  isEditing, editVal, onEditChange, onEditBlur, onEditKeyDown,
}) {
  return (
    <div
      onClick={onLoad}
      style={{
        borderLeft: `2px solid ${isActive ? '#1DB954' : 'transparent'}`,
        background: isActive ? 'rgba(29,185,84,0.08)' : 'transparent',
      }}
      className="group flex items-center gap-2 px-4 py-2 cursor-pointer transition-colors hover:bg-[#1e1e28]"
    >
      <span style={{ color: isActive ? '#1DB954' : '#2d2d3e' }}
        className="text-xs shrink-0 group-hover:text-[#a78bfa] transition-colors">
        {isActive ? '▶' : '○'}
      </span>
      {isEditing ? (
        <input
          autoFocus value={editVal} onChange={onEditChange}
          onFocus={e => e.target.select()} onBlur={onEditBlur} onKeyDown={onEditKeyDown}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 px-2 py-0.5 rounded text-sm text-white focus:outline-none"
          style={{ background: '#1e1e28', border: '1px solid #1DB954' }}
        />
      ) : (
        <span onDoubleClick={onStartEdit} title="더블클릭으로 제목 편집"
          className="flex-1 min-w-0 text-sm truncate transition-colors"
          style={{ color: isActive ? '#ffffff' : '#a78bfa' }}>
          {entry.title}
        </span>
      )}
      <span className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#a78bfa' }}>
        {formatDate(entry.savedAt ?? entry.addedAt)}
      </span>
      <button onClick={onStartEdit} title="제목 편집"
        className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity px-0.5 hover:text-white"
        style={{ color: '#a78bfa' }}>✏️</button>
      <button onClick={onRemove} title="삭제"
        className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity px-0.5 hover:text-red-400"
        style={{ color: '#a78bfa' }}>🗑</button>
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
        background: '#1a1a2e', borderRadius: '16px', padding: '28px 32px 24px',
        width: '100%', maxWidth: '480px',
        border: '1px solid rgba(29,185,84,0.25)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#1DB954', marginBottom: '4px', fontWeight: 600 }}>GUIDE</div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>CopyPractice Player 사용법</h2>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: '20px', lineHeight: 1, padding: '2px 4px' }}>✕</button>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {HELP_STEPS.map(({ icon, text }, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{
                minWidth: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(29,185,84,0.12)', border: '1px solid rgba(29,185,84,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#1DB954', flexShrink: 0,
              }}>{i + 1}</span>
              <div style={{ paddingTop: '4px' }}>
                <span style={{ marginRight: '6px' }}>{icon}</span>
                <span style={{ fontSize: '14px', color: '#e2e2e2', lineHeight: 1.5 }}>{text}</span>
              </div>
            </li>
          ))}
        </ol>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)}
              style={{ accentColor: '#1DB954', width: '14px', height: '14px', cursor: 'pointer' }} />
            <span style={{ fontSize: '12px', color: '#a78bfa' }}>다시 보지 않기</span>
          </label>
          <button onClick={handleClose} style={{
            padding: '8px 24px', borderRadius: '8px', border: 'none',
            background: '#1DB954', color: '#000000', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
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
  const interval = pickTickInterval(duration)
  const ticks = []
  if (duration > 0) {
    for (let t = 0; t <= duration + 0.001; t += interval) ticks.push(t)
  }

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative flex-1 select-none"
      style={{ height: '32px', touchAction: 'none', cursor: 'pointer' }}
    >
      {/* 트랙 배경 */}
      <div className="absolute left-0 right-0 top-3 rounded-full pointer-events-none"
        style={{ height: '4px', background: '#2d2d3e' }} />
      {/* 재생 진행 */}
      <div className="absolute left-0 top-3 rounded-full pointer-events-none"
        style={{ height: '4px', width: `${displayRatio * 100}%`, background: '#1DB954' }} />

      {/* 시간 눈금 */}
      {ticks.map(t => (
        <div key={t} className="absolute top-[18px] pointer-events-none"
          style={{ left: `${(t / duration) * 100}%`, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ width: '1px', height: '4px', background: '#3d3d52', margin: '0 auto' }} />
          <span style={{ fontSize: '9px', color: '#5a5a72', whiteSpace: 'nowrap' }}>{formatTime(t)}</span>
        </div>
      ))}

      {/* A/B 구간 마커 */}
      {pointA !== null && duration > 0 && (
        <div className="absolute top-3 -translate-y-1/2 w-1.5 h-4 rounded-sm pointer-events-none"
          style={{ left: `${(pointA / duration) * 100}%`, background: '#a78bfa' }} />
      )}
      {pointB !== null && duration > 0 && (
        <div className="absolute top-3 -translate-y-1/2 w-1.5 h-4 rounded-sm pointer-events-none"
          style={{ left: `${(pointB / duration) * 100}%`, background: '#a78bfa', opacity: 0.6 }} />
      )}

      {/* 현재 위치 마커: △─│─▽ */}
      <div className="absolute top-3 flex flex-col items-center pointer-events-none"
        style={{ left: `${displayRatio * 100}%`, transform: 'translate(-50%, -50%)' }}>
        <div style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderBottom: '6px solid #1DB954',
        }} />
        <div style={{ width: '2px', height: '10px', background: '#1DB954' }} />
        <div style={{
          width: 0, height: 0,
          borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
          borderTop: '6px solid #1DB954',
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
    document.execCommand('foreColor', false, '#d1d5db')
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
    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(29,185,84,0.18)' : '#1e1e28',
    color: active ? '#1DB954' : '#a78bfa',
    boxShadow: active ? 'inset 0 0 0 1px #1DB954' : 'none',
  })
  const skipUnitBtn = (active) => ({
    padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(29,185,84,0.18)' : '#1e1e28',
    color: active ? '#1DB954' : '#a78bfa',
    boxShadow: active ? 'inset 0 0 0 1px #1DB954' : 'none',
  })
  const abBtn = (active) => ({
    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    fontFamily: 'monospace', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? 'rgba(167,139,250,0.18)' : '#1e1e28',
    color: '#a78bfa',
    boxShadow: active ? 'inset 0 0 0 1px rgba(167,139,250,0.6)' : 'none',
  })

  return (
    <div style={{ background: '#0f0f13' }} className="h-screen text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header className="shrink-0 flex items-center px-4 py-3" style={{ borderBottom: '1px solid #2d2d3e' }}>
        <div className="flex-1" />
        <div className="flex flex-col items-center gap-0.5">
          <span style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.3em', color: '#1DB954', lineHeight: 1 }}>CPP</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: '#a78bfa', fontWeight: 400 }}>COPYPRACTICE PLAYER</span>
        </div>
        <div className="flex-1 flex justify-end items-center gap-3">
          <button onClick={() => setShowHelp(true)} title="사용법 보기" style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: '1px solid #2d2d3e', background: '#1e1e28',
            color: '#a78bfa', fontSize: '13px', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>?</button>
          <span style={{ fontSize: '11px', color: viewMode === 'desktop' ? '#1DB954' : '#a78bfa' }}>PC</span>
          <button onClick={() => setViewMode(m => m === 'desktop' ? 'mobile' : 'desktop')} style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: viewMode === 'mobile' ? '#1DB954' : '#2d2d3e',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: '2px',
              left: viewMode === 'mobile' ? '22px' : '2px',
              width: '20px', height: '20px', borderRadius: '50%',
              background: '#ffffff', transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontSize: '11px', color: viewMode === 'mobile' ? '#1DB954' : '#a78bfa' }}>모바일</span>
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
          style={viewMode === 'mobile' ? { background: '#0f0f13' } : undefined}>

          {/* URL / File 입력 */}
          <div className={`shrink-0 flex gap-1.5 items-center flex-nowrap ${viewMode === 'mobile' ? 'px-2 py-1' : 'px-4 py-2.5 flex-wrap'}`}
            style={{ borderBottom: '1px solid #2d2d3e' }}>
            <button onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1 rounded-lg transition-colors shrink-0 ${viewMode === 'mobile' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
              style={{ background: '#1e1e28', color: '#a78bfa', border: '1px solid #2d2d3e' }}>
              📂{viewMode !== 'mobile' && <span>로컬 파일</span>}
            </button>
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} />
            {fileName && (
              <span className="text-xs truncate max-w-24 shrink-0" style={{ color: '#a78bfa' }} title={fileName}>{fileName}</span>
            )}
            <form onSubmit={handleYouTubeSubmit} className="flex gap-1.5 flex-1 min-w-0">
              <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder={viewMode === 'mobile' ? 'YouTube URL...' : 'YouTube URL 붙여넣기...'}
                className={`flex-1 min-w-0 rounded-lg focus:outline-none transition-colors ${viewMode === 'mobile' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}`}
                style={{ background: '#1e1e28', border: '1px solid #2d2d3e', color: '#ffffff' }}
              />
              <button type="submit"
                className={`flex items-center gap-1 rounded-lg font-medium transition-colors shrink-0 ${viewMode === 'mobile' ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}`}
                style={{ background: '#1DB954', color: '#000000' }}>
                ▶{viewMode !== 'mobile' && ' 재생'}
              </button>
            </form>
          </div>

          {/* 영상 기록 */}
          <div className="shrink-0" style={{ borderBottom: '1px solid #2d2d3e' }}>
            <button onClick={() => setShowHistory(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
              style={{ color: '#a78bfa' }}>
              <span className="text-xs font-medium">🕐 영상 기록</span>
              {history.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#1e1e28', color: '#a78bfa' }}>
                  {history.length}
                </span>
              )}
              <span className="ml-auto text-xs">{showHistory ? '▲' : '▼'}</span>
            </button>
            {showHistory && (
              <div className="max-h-44 overflow-y-auto">
                {history.length === 0
                  ? <p className="px-4 py-3 text-xs" style={{ color: '#2d2d3e' }}>아직 기록이 없습니다.</p>
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
              style={{ background: '#16161d', color: '#a78bfa', borderBottom: '1px solid #2d2d3e', border: 'none', cursor: 'pointer' }}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ color: '#2d2d3e' }}>
                <span className="text-5xl">♪</span>
                <p className="text-sm" style={{ color: '#a78bfa' }}>파일 업로드 또는 YouTube URL 입력</p>
              </div>
            )}
          </div>

          {/* 컨트롤 패널 */}
          <div className={`px-4 py-3 flex flex-col overflow-y-auto ${viewMode === 'mobile' ? 'shrink-0 gap-3' : 'flex-[1] min-h-0 gap-0 justify-between overflow-hidden'}`}
            style={{ background: '#16161d', borderTop: '1px solid #2d2d3e' }}>

            {/* 시크바 */}
            <div className="flex items-center gap-3 text-xs font-mono" style={{ color: '#a78bfa' }}>
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

            {/* 재생 · 속도 · 스킵 · 볼륨 */}
            <div className={`flex items-center flex-nowrap overflow-x-auto ${viewMode === 'mobile' ? 'gap-2 pb-0.5' : 'gap-3 flex-wrap'}`}>
              {/* 재생/일시정지 */}
              <button
                onClick={() => setPlaying(p => !p)} disabled={!url}
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                style={{ background: '#1DB954', color: '#000000' }}
              >{playing ? '⏸' : '▶'}</button>

              {/* 전체 반복 버튼 */}
              <button
                onClick={() => setLoopAll(p => !p)} disabled={!url}
                title="전체 반복"
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all disabled:opacity-30 shrink-0"
                style={{
                  background: loopAll ? 'rgba(29,185,84,0.18)' : '#1e1e28',
                  color: loopAll ? '#1DB954' : '#a78bfa',
                  border: loopAll ? '1px solid #1DB954' : '1px solid #2d2d3e',
                  cursor: 'pointer',
                }}
              >🔁</button>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: '#a78bfa' }}>속도</span>
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => setSpeed(s)} style={speedBtn(speed === s)}>{s}x</button>
                ))}
              </div>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: '#a78bfa' }}>스킵</span>
                <button onClick={() => skip(-skipSeconds)} disabled={!url}
                  className={`rounded text-sm transition-colors disabled:opacity-30 ${viewMode === 'mobile' ? 'px-3 min-h-[44px]' : 'px-2.5 py-1'}`}
                  style={{ background: '#1e1e28', color: '#a78bfa', border: 'none', cursor: 'pointer' }}>◀◀</button>
                <button onClick={() => skip(skipSeconds)} disabled={!url}
                  className={`rounded text-sm transition-colors disabled:opacity-30 ${viewMode === 'mobile' ? 'px-3 min-h-[44px]' : 'px-2.5 py-1'}`}
                  style={{ background: '#1e1e28', color: '#a78bfa', border: 'none', cursor: 'pointer' }}>▶▶</button>
                <div className="flex gap-1 ml-1">
                  {SKIP_UNITS.map(u => (
                    <button key={u} onClick={() => setSkipSeconds(u)} style={skipUnitBtn(skipSeconds === u)}>{u}s</button>
                  ))}
                </div>
              </div>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0 text-xs" style={{ color: '#a78bfa' }}>
                <span>{volPct === 0 ? '🔇' : volPct < 50 ? '🔉' : '🔊'}</span>
                <span className="font-mono w-8">{volPct}%</span>
              </div>
            </div>

            {/* A-B 반복 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: '#a78bfa' }}>🔂 구간 반복</span>
              <button onClick={handleSetA} disabled={!url}
                className={viewMode === 'mobile' ? 'min-h-[44px]' : ''}
                style={{ ...abBtn(pointA !== null), opacity: !url ? 0.3 : 1 }}>
                ⬇ A {pointA !== null ? formatTime(pointA) : '시작'}
              </button>
              <button onClick={handleSetB} disabled={!url}
                className={viewMode === 'mobile' ? 'min-h-[44px]' : ''}
                style={{ ...abBtn(pointB !== null), opacity: !url ? 0.3 : 1 }}>
                ⬆ B {pointB !== null ? formatTime(pointB) : '끝'}
              </button>
              <button onClick={handleToggleLoop} disabled={!canLoop}
                className={viewMode === 'mobile' ? 'min-h-[44px]' : ''}
                style={{
                  padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                  border: 'none', cursor: canLoop ? 'pointer' : 'not-allowed',
                  opacity: !canLoop ? 0.3 : 1,
                  background: looping ? 'rgba(29,185,84,0.18)' : '#1e1e28',
                  color: looping ? '#1DB954' : '#a78bfa',
                  boxShadow: looping ? 'inset 0 0 0 1px #1DB954' : 'none',
                }}
              >{looping ? '🔁 반복 중' : '↩ 반복'}</button>
              <button onClick={handleClearAB} disabled={pointA === null && pointB === null}
                className={viewMode === 'mobile' ? 'min-h-[44px]' : ''}
                style={{
                  padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                  border: 'none', cursor: 'pointer',
                  background: '#1e1e28', color: '#a78bfa',
                  opacity: pointA === null && pointB === null ? 0.3 : 1,
                }}>✕</button>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — 가사 패널 ══ */}
        <div className={`min-w-0 flex flex-col ${viewMode === 'mobile' ? 'border-t' : 'flex-1 border-l'} border-[#2d2d3e]`}>
          {/* 가사 툴바 */}
          <div className="shrink-0 px-4 py-2.5 flex items-center gap-3 flex-wrap"
            style={{ borderBottom: '1px solid #2d2d3e', background: '#16161d' }}>
            <span className="text-xs font-medium shrink-0" style={{ color: '#a78bfa' }}>LYRICS</span>
            <VDivider />
            <div className="flex items-center gap-1 shrink-0">
              {FONT_SIZES.map(({ size, label }) => (
                <button key={size} onClick={() => setFontSize(size)} style={{
                  padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: fontSize === size ? '#2d2d3e' : 'transparent',
                  color: fontSize === size ? '#ffffff' : '#a78bfa',
                }}>{label}</button>
              ))}
            </div>
            <VDivider />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs" style={{ color: '#a78bfa' }}>형광</span>
              {HIGHLIGHTS.map(({ color, bg }) => (
                <button key={color}
                  onMouseDown={e => { e.preventDefault(); setActiveHighlight(color); applyHighlight(color) }}
                  className={`w-5 h-5 rounded-full ${bg} hover:scale-110 transition-transform`}
                  style={activeHighlight === color ? { outline: '2px solid #ffffff', outlineOffset: '2px' } : {}}
                />
              ))}
              <button onMouseDown={e => { e.preventDefault(); removeHighlight() }} style={{
                padding: '2px 8px', borderRadius: '5px', fontSize: '11px',
                border: '1px solid #2d2d3e', cursor: 'pointer',
                background: 'transparent', color: '#a78bfa',
              }}>제거</button>
            </div>
            <VDivider />
            <button onClick={() => { setShowSaveForm(p => !p); setSaveTitle('') }} style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: showSaveForm ? 'rgba(29,185,84,0.18)' : '#1e1e28',
              color: showSaveForm ? '#1DB954' : '#a78bfa',
              boxShadow: showSaveForm ? 'inset 0 0 0 1px #1DB954' : 'none',
            }}>💾 저장</button>
            <div className="ml-auto flex items-center gap-2">
              {[{ key: 'A', label: 'A' }, { key: 'AB', label: 'A│B' }, { key: 'B', label: 'B' }].map(({ key, label }) => (
                <button key={key} onClick={() => switchLyricsView(key)}
                  className="min-h-[44px] md:min-h-[28px]"
                  style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: lyricsView === key ? 'rgba(29,185,84,0.18)' : '#1e1e28',
                    color: lyricsView === key ? '#1DB954' : '#a78bfa',
                    boxShadow: lyricsView === key ? 'inset 0 0 0 1px #1DB954' : 'none',
                  }}>{label}</button>
              ))}
              <div style={{ width: '1px', height: '16px', background: '#2d2d3e', flexShrink: 0 }} />
              <button onClick={clearLyrics} style={{
                fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa',
              }}>지우기</button>
            </div>
          </div>

          {/* 저장 폼 */}
          {showSaveForm && (
            <div className="shrink-0 flex items-center gap-2 px-4 py-2.5"
              style={{ background: '#16161d', borderBottom: '1px solid #2d2d3e' }}>
              <span className="text-xs shrink-0" style={{ color: '#a78bfa' }}>제목</span>
              <input autoFocus value={saveTitle} onChange={e => setSaveTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveLyrics()
                  if (e.key === 'Escape') setShowSaveForm(false)
                }}
                placeholder="가사 제목을 입력하세요..."
                className="flex-1 px-3 py-1.5 rounded text-sm focus:outline-none"
                style={{ background: '#1e1e28', border: '1px solid #2d2d3e', color: '#ffffff' }}
              />
              <button onClick={handleSaveLyrics}
                className="px-3 py-1.5 rounded text-sm font-medium shrink-0"
                style={{ background: '#1DB954', color: '#000000', border: 'none', cursor: 'pointer' }}>저장</button>
              <button onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 rounded text-sm shrink-0"
                style={{ background: '#1e1e28', color: '#a78bfa', border: 'none', cursor: 'pointer' }}>취소</button>
            </div>
          )}

          {/* 가사 라이브러리 */}
          <div className="shrink-0" style={{ borderBottom: '1px solid #2d2d3e' }}>
            <button onClick={() => setShowLyricsLib(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left"
              style={{ color: '#a78bfa', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span className="text-xs font-medium">📚 저장된 가사</span>
              {lyricsLib.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#1e1e28', color: '#a78bfa' }}>
                  {lyricsLib.length}
                </span>
              )}
              <span className="ml-auto text-xs">{showLyricsLib ? '▲' : '▼'}</span>
            </button>
            {showLyricsLib && (
              <div className="max-h-44 overflow-y-auto">
                {lyricsLib.length === 0
                  ? <p className="px-4 py-3 text-xs" style={{ color: '#2d2d3e' }}>저장된 가사가 없습니다.</p>
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
                background: activePanel === 1 ? 'rgba(29,185,84,0.03)' : '#0f0f13',
                borderRight: lyricsView === 'AB' ? `1px solid ${activePanel === 1 ? 'rgba(29,185,84,0.2)' : '#2d2d3e'}` : 'none',
                minHeight: viewMode === 'mobile' ? '60vh' : undefined,
              }}
              className={`flex-1 p-5 text-white leading-relaxed focus:outline-none ${viewMode === 'mobile' ? '' : 'overflow-y-auto'}`}
            />
            <div ref={lyricsRef2} contentEditable suppressContentEditableWarning spellCheck={false}
              onFocus={() => setActivePanel(2)}
              data-placeholder={'B 패널\n\n가사를 붙여넣거나 직접 입력하세요.'}
              style={{
                display: lyricsView === 'A' ? 'none' : 'block',
                fontSize: `${fontSize}px`,
                background: activePanel === 2 ? 'rgba(29,185,84,0.03)' : '#0f0f13',
                minHeight: viewMode === 'mobile' ? '60vh' : undefined,
              }}
              className={`flex-1 p-5 text-white leading-relaxed focus:outline-none ${viewMode === 'mobile' ? '' : 'overflow-y-auto'}`}
            />
          </div>
        </div>
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
                       }
