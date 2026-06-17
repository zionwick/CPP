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

function VDivider() {
  return <div className="w-px self-stretch shrink-0" style={{ background: '#2d2d3e' }} />
}

// HistoryRow는 App 밖에 정의 — App 안에 두면 매 렌더마다 unmount/remount 발생
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
          autoFocus
          value={editVal}
          onChange={onEditChange}
          onFocus={e => e.target.select()}
          onBlur={onEditBlur}
          onKeyDown={onEditKeyDown}
          onClick={e => e.stopPropagation()}
          className="flex-1 min-w-0 px-2 py-0.5 rounded text-sm text-white focus:outline-none"
          style={{ background: '#1e1e28', border: '1px solid #1DB954' }}
        />
      ) : (
        <span
          onDoubleClick={onStartEdit}
          title="더블클릭으로 제목 편집"
          className="flex-1 min-w-0 text-sm truncate transition-colors"
          style={{ color: isActive ? '#ffffff' : '#a78bfa' }}
        >
          {entry.title}
        </span>
      )}

      <span className="text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: '#a78bfa' }}>
        {formatDate(entry.savedAt ?? entry.addedAt)}
      </span>
      <button onClick={onStartEdit} title="제목 편집"
        className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity px-0.5 hover:text-white"
        style={{ color: '#a78bfa' }}
      >✏️</button>
      <button onClick={onRemove} title="삭제"
        className="opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity px-0.5 hover:text-red-400"
        style={{ color: '#a78bfa' }}
      >🗑</button>
    </div>
  )
}

export default function App() {
  const playerRef    = useRef(null)
  const fileInputRef = useRef(null)
  const lyricsRef    = useRef(null)
  const lyricsRef2   = useRef(null)
  const ccClearedRef = useRef(false)

  // ── 미디어 상태 ────────────────────────────────────────────
  const [url, setUrl]           = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [fileName, setFileName] = useState('')

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
  const [skipSeconds, setSkipSeconds] = useState(5)

  // ── 영상 기록 ──────────────────────────────────────────────
  const [history, setHistory]             = useState(() => readStorage(HISTORY_KEY))
  const [showHistory, setShowHistory]     = useState(true)
  const [activeVideoId, setActiveVideoId] = useState(null)
  const [editVideoId, setEditVideoId]     = useState(null)
  const [editVideoTitle, setEditVideoTitle] = useState('')

  // ── 가사 상태 ──────────────────────────────────────────────
  const [fontSize, setFontSize]               = useState(30)
  const [activeHighlight, setActiveHighlight] = useState(HIGHLIGHTS[0].color)

  // ── 가사 라이브러리 ────────────────────────────────────────
  const [lyricsLib, setLyricsLib]           = useState(() => readStorage(LYRICS_KEY))
  const [showLyricsLib, setShowLyricsLib]   = useState(true)
  const [showSaveForm, setShowSaveForm]     = useState(false)
  const [saveTitle, setSaveTitle]           = useState('')
  const [activeLyricsId, setActiveLyricsId] = useState(null)
  const [editLyricsId, setEditLyricsId]     = useState(null)
  const [editLyricsTitle, setEditLyricsTitle] = useState('')
  const [activePanel, setActivePanel]       = useState(1)

  // ── localStorage 헬퍼 ─────────────────────────────────────
  const persistHistory = (entries) => {
    setHistory(entries)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  }
  const persistLyricsLib = (entries) => {
    setLyricsLib(entries)
    localStorage.setItem(LYRICS_KEY, JSON.stringify(entries))
  }

  // ── 영상 기록 함수 ─────────────────────────────────────────
  const addToHistory = (newUrl, defaultTitle) => {
    setHistory(prev => {
      const existing = prev.find(e => e.url === newUrl)
      let updated
      if (existing) {
        updated = [{ ...existing, addedAt: Date.now() }, ...prev.filter(e => e.url !== newUrl)]
        setActiveVideoId(existing.id)
      } else {
        const entry = { id: crypto.randomUUID(), url: newUrl, title: defaultTitle, addedAt: Date.now() }
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
    loadUrl(entry.url, entry.title)
    setActiveVideoId(entry.id)
    persistHistory([{ ...entry, addedAt: Date.now() }, ...history.filter(h => h.id !== entry.id)])
  }

  // ── 미디어 로드 ────────────────────────────────────────────
  const disableYouTubeCaptions = (el) => {
    try { el?.api?.setOption('captions', 'track', {}) } catch {}
  }

  const loadUrl = (newUrl, name = '') => {
    setUrl(newUrl)
    setFileName(name)
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
    loadUrl(objectUrl, file.name)
    addToHistory(objectUrl, file.name)
    e.target.value = ''
  }

  const handleYouTubeSubmit = (e) => {
    e.preventDefault()
    const trimmed = urlInput.trim()
    if (!trimmed) return
    loadUrl(trimmed)
    addToHistory(trimmed, 'YouTube 영상')
  }

  // ── 가사 패널 헬퍼 ─────────────────────────────────────────
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

  // ── 형광펜 ─────────────────────────────────────────────────
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

  // ── 전역 키보드 ────────────────────────────────────────────
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
        if (playerRef.current)
          playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - skipSeconds)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        if (playerRef.current)
          playerRef.current.currentTime = Math.min(
            playerRef.current.duration || 0, playerRef.current.currentTime + skipSeconds)
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

  // ── 재생 이벤트 ────────────────────────────────────────────
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
    } else {
      setPlaying(false)
    }
  }, [looping, pointA])

  // ── 시크바 ─────────────────────────────────────────────────
  const handleSeekMouseDown = () => setSeeking(true)
  const handleSeekChange    = (e) => setPlayed(parseFloat(e.target.value))
  const handleSeekMouseUp   = (e) => {
    setSeeking(false)
    if (playerRef.current)
      playerRef.current.currentTime = parseFloat(e.target.value) * duration
  }
  const skip = (sec) => {
    if (!playerRef.current) return
    playerRef.current.currentTime = Math.max(
      0, Math.min(playerRef.current.duration || 0, playerRef.current.currentTime + sec))
  }

  // ── A-B 반복 ───────────────────────────────────────────────
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

  // ── 스타일 헬퍼 ────────────────────────────────────────────
  const btnBase = 'transition-colors cursor-pointer'

  const speedBtn = (active) => ({
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'rgba(29,185,84,0.18)' : '#1e1e28',
    color: active ? '#1DB954' : '#a78bfa',
    boxShadow: active ? 'inset 0 0 0 1px #1DB954' : 'none',
  })

  const skipUnitBtn = (active) => ({
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'rgba(29,185,84,0.18)' : '#1e1e28',
    color: active ? '#1DB954' : '#a78bfa',
    boxShadow: active ? 'inset 0 0 0 1px #1DB954' : 'none',
  })

  const abBtn = (active) => ({
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'monospace',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    background: active ? 'rgba(167,139,250,0.18)' : '#1e1e28',
    color: active ? '#a78bfa' : '#a78bfa',
    boxShadow: active ? 'inset 0 0 0 1px rgba(167,139,250,0.6)' : 'none',
  })

  return (
    <div style={{ background: '#0f0f13' }} className="h-screen text-white flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <header
        className="shrink-0 flex items-center justify-center py-3"
        style={{ borderBottom: '1px solid #2d2d3e' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span style={{
            fontSize: '2rem',
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: '#1DB954',
            lineHeight: 1,
          }}>CPP</span>
          <span style={{
            fontSize: '0.6rem',
            letterSpacing: '0.25em',
            color: '#a78bfa',
            fontWeight: 400,
          }}>COPYPRACTICE PLAYER</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══ LEFT — Player ══ */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* URL / File 입력 */}
          <div
            className="shrink-0 flex gap-2 items-center px-4 py-2.5 flex-wrap"
            style={{ borderBottom: '1px solid #2d2d3e' }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ background: '#1e1e28', color: '#a78bfa', border: '1px solid #2d2d3e' }}
              onMouseEnter={e => e.currentTarget.style.color='#ffffff'}
              onMouseLeave={e => e.currentTarget.style.color='#a78bfa'}
            >📂 <span>로컬 파일</span></button>
            <input ref={fileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleFileChange} />
            {fileName && (
              <span className="text-xs truncate max-w-32" style={{ color: '#a78bfa' }} title={fileName}>{fileName}</span>
            )}
            <form onSubmit={handleYouTubeSubmit} className="flex gap-2 flex-1 min-w-52">
              <input
                type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="YouTube URL 붙여넣기..."
                className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none transition-colors"
                style={{ background: '#1e1e28', border: '1px solid #2d2d3e', color: '#ffffff' }}
                onFocus={e => e.target.style.borderColor='#1DB954'}
                onBlur={e => e.target.style.borderColor='#2d2d3e'}
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#1DB954', color: '#000000' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}
              >▶ 재생</button>
            </form>
          </div>

          {/* 영상 기록 */}
          <div className="shrink-0" style={{ borderBottom: '1px solid #2d2d3e' }}>
            <button
              onClick={() => setShowHistory(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
              style={{ color: '#a78bfa' }}
              onMouseEnter={e => e.currentTarget.style.background='#1e1e28'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
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
                        if (e.key === 'Enter')  commitEditVideo()
                        if (e.key === 'Escape') setEditVideoId(null)
                      }}
                    />
                  ))
                }
              </div>
            )}
          </div>

          {/* 영상 플레이어 */}
          <div className="flex-[4] min-h-0 bg-black relative">
            {url ? (
              <>
                <ReactPlayer
                  ref={playerRef} src={url}
                  playing={playing} playbackRate={speed} volume={volume}
                  onTimeUpdate={handleTimeUpdate}
                  onDurationChange={handleDurationChange}
                  onEnded={handleEnded}
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
          <div
            className="flex-[1] min-h-0 px-4 py-3 flex flex-col justify-between overflow-hidden"
            style={{ background: '#16161d', borderTop: '1px solid #2d2d3e' }}
          >
            {/* 시크바 */}
            <div className="flex items-center gap-3 text-xs font-mono" style={{ color: '#a78bfa' }}>
              <span className="w-11 text-right shrink-0">{formatTime(playedSeconds)}</span>
              <div className="relative flex-1">
                <input type="range" min={0} max={1} step={0.0001} value={played}
                  onMouseDown={handleSeekMouseDown} onChange={handleSeekChange} onMouseUp={handleSeekMouseUp}
                  className="w-full cursor-pointer"
                />
                {pointA !== null && duration > 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-sm pointer-events-none"
                    style={{ left: `${(pointA / duration) * 100}%`, background: '#a78bfa' }} />
                )}
                {pointB !== null && duration > 0 && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-sm pointer-events-none"
                    style={{ left: `${(pointB / duration) * 100}%`, background: '#a78bfa', opacity: 0.6 }} />
                )}
              </div>
              <span className="w-11 shrink-0">{formatTime(duration)}</span>
            </div>

            {/* 재생 · 속도 · 스킵 · 볼륨 */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => setPlaying(p => !p)} disabled={!url}
                aria-label={playing ? '일시정지' : '재생'}
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                style={{ background: '#1DB954', color: '#000000' }}
                onMouseEnter={e => !e.currentTarget.disabled && (e.currentTarget.style.opacity='0.85')}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}
              >{playing ? '⏸' : '▶'}</button>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: '#a78bfa' }}>속도</span>
                {SPEEDS.map(s => (
                  <button key={s} onClick={() => setSpeed(s)} style={speedBtn(speed === s)}>
                    {s}x
                  </button>
                ))}
              </div>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs" style={{ color: '#a78bfa' }}>스킵</span>
                <button onClick={() => skip(-skipSeconds)} disabled={!url}
                  className="px-2.5 py-1 rounded text-sm transition-colors disabled:opacity-30"
                  style={{ background: '#1e1e28', color: '#a78bfa', border: 'none', cursor: 'pointer' }}
                >◀◀</button>
                <button onClick={() => skip(skipSeconds)} disabled={!url}
                  className="px-2.5 py-1 rounded text-sm transition-colors disabled:opacity-30"
                  style={{ background: '#1e1e28', color: '#a78bfa', border: 'none', cursor: 'pointer' }}
                >▶▶</button>
                <div className="flex gap-1 ml-1">
                  {SKIP_UNITS.map(u => (
                    <button key={u} onClick={() => setSkipSeconds(u)} style={skipUnitBtn(skipSeconds === u)}>
                      {u}s
                    </button>
                  ))}
                </div>
              </div>

              <VDivider />

              <div className="flex items-center gap-1.5 shrink-0 text-xs" style={{ color: '#a78bfa' }}>
                <span>{volPct === 0 ? '🔇' : volPct < 50 ? '🔉' : '🔊'}</span>
                <span className="font-mono w-8">{volPct}%</span>
                <span style={{ color: '#2d2d3e' }}>↑↓</span>
              </div>
            </div>

            {/* A-B 반복 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium shrink-0" style={{ color: '#a78bfa' }}>🔂 구간 반복</span>
              <button onClick={handleSetA} disabled={!url} style={{ ...abBtn(pointA !== null), opacity: !url ? 0.3 : 1 }}>
                ⬇ A {pointA !== null ? formatTime(pointA) : '시작'}
              </button>
              <button onClick={handleSetB} disabled={!url} style={{ ...abBtn(pointB !== null), opacity: !url ? 0.3 : 1 }}>
                ⬆ B {pointB !== null ? formatTime(pointB) : '끝'}
              </button>
              <button onClick={handleToggleLoop} disabled={!canLoop}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: canLoop ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  opacity: !canLoop ? 0.3 : 1,
                  background: looping ? 'rgba(29,185,84,0.18)' : '#1e1e28',
                  color: looping ? '#1DB954' : '#a78bfa',
                  boxShadow: looping ? 'inset 0 0 0 1px #1DB954' : 'none',
                }}
              >{looping ? '🔁 반복 중' : '↩ 반복'}</button>
              <button onClick={handleClearAB} disabled={pointA === null && pointB === null}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  border: 'none',
                  cursor: 'pointer',
                  background: '#1e1e28',
                  color: '#a78bfa',
                  opacity: pointA === null && pointB === null ? 0.3 : 1,
                }}
              >✕</button>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — 가사 패널 ══ */}
        <div
          className="flex-1 min-w-0 flex flex-col"
          style={{ borderLeft: '1px solid #2d2d3e' }}
        >
          {/* 가사 툴바 */}
          <div
            className="shrink-0 px-4 py-2.5 flex items-center gap-3 flex-wrap"
            style={{ borderBottom: '1px solid #2d2d3e', background: '#16161d' }}
          >
            <span className="text-xs font-medium shrink-0" style={{ color: '#a78bfa' }}>LYRICS</span>

            <VDivider />

            {/* 폰트 크기 */}
            <div className="flex items-center gap-1 shrink-0">
              {FONT_SIZES.map(({ size, label }) => (
                <button key={size} onClick={() => setFontSize(size)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: fontSize === size ? '#2d2d3e' : 'transparent',
                    color: fontSize === size ? '#ffffff' : '#a78bfa',
                  }}
                >{label}</button>
              ))}
            </div>

            <VDivider />

            {/* 형광펜 */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs" style={{ color: '#a78bfa' }}>형광</span>
              {HIGHLIGHTS.map(({ color, bg }) => (
                <button key={color}
                  onMouseDown={e => { e.preventDefault(); setActiveHighlight(color); applyHighlight(color) }}
                  className={`w-5 h-5 rounded-full ${bg} hover:scale-110 transition-transform`}
                  style={activeHighlight === color ? { outline: '2px solid #ffffff', outlineOffset: '2px' } : {}}
                />
              ))}
              <button
                onMouseDown={e => { e.preventDefault(); removeHighlight() }}
                style={{
                  padding: '2px 8px',
                  borderRadius: '5px',
                  fontSize: '11px',
                  border: '1px solid #2d2d3e',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: '#a78bfa',
                  transition: 'all 0.15s',
                }}
              >제거</button>
            </div>

            <VDivider />

            {/* 저장 버튼 */}
            <button
              onClick={() => { setShowSaveForm(p => !p); setSaveTitle('') }}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: showSaveForm ? 'rgba(29,185,84,0.18)' : '#1e1e28',
                color: showSaveForm ? '#1DB954' : '#a78bfa',
                boxShadow: showSaveForm ? 'inset 0 0 0 1px #1DB954' : 'none',
              }}
            >💾 저장</button>

            {/* 패널 표시 + 지우기 */}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs" style={{ color: '#a78bfa' }}>
                패널{' '}
                <span style={{ color: activePanel === 1 ? '#1DB954' : '#a78bfa', fontWeight: 700 }}>A</span>
                {' '}/{' '}
                <span style={{ color: activePanel === 2 ? '#1DB954' : '#a78bfa', fontWeight: 700 }}>B</span>
              </span>
              <button onClick={clearLyrics}
                style={{
                  fontSize: '11px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#a78bfa',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color='#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color='#a78bfa'}
              >지우기</button>
            </div>
          </div>

          {/* 저장 폼 */}
          {showSaveForm && (
            <div
              className="shrink-0 flex items-center gap-2 px-4 py-2.5"
              style={{ background: '#16161d', borderBottom: '1px solid #2d2d3e' }}
            >
              <span className="text-xs shrink-0" style={{ color: '#a78bfa' }}>제목</span>
              <input
                autoFocus
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleSaveLyrics()
                  if (e.key === 'Escape') setShowSaveForm(false)
                }}
                placeholder="가사 제목을 입력하세요..."
                className="flex-1 px-3 py-1.5 rounded text-sm focus:outline-none transition-colors"
                style={{ background: '#1e1e28', border: '1px solid #2d2d3e', color: '#ffffff' }}
                onFocus={e => e.target.style.borderColor='#1DB954'}
                onBlur={e => e.target.style.borderColor='#2d2d3e'}
              />
              <button onClick={handleSaveLyrics}
                className="px-3 py-1.5 rounded text-sm font-medium transition-all shrink-0"
                style={{ background: '#1DB954', color: '#000000', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.opacity='0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity='1'}
              >저장</button>
              <button onClick={() => setShowSaveForm(false)}
                className="px-3 py-1.5 rounded text-sm shrink-0 transition-colors"
                style={{ background: '#1e1e28', color: '#a78bfa', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color='#ffffff'}
                onMouseLeave={e => e.currentTarget.style.color='#a78bfa'}
              >취소</button>
            </div>
          )}

          {/* 가사 라이브러리 */}
          <div className="shrink-0" style={{ borderBottom: '1px solid #2d2d3e' }}>
            <button
              onClick={() => setShowLyricsLib(p => !p)}
              className="w-full flex items-center gap-2 px-4 py-2 text-left transition-colors"
              style={{ color: '#a78bfa', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background='#1e1e28'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
            >
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
                        if (e.key === 'Enter')  commitEditLyrics()
                        if (e.key === 'Escape') setEditLyricsId(null)
                      }}
                    />
                  ))
                }
              </div>
            )}
          </div>

          {/* 가사 편집 영역 — A / B 5:5 */}
          <div className="flex-1 flex overflow-hidden">
            <div
              ref={lyricsRef}
              contentEditable suppressContentEditableWarning spellCheck={false}
              onFocus={() => setActivePanel(1)}
              data-placeholder={'A 패널\n\n가사를 붙여넣거나 직접 입력하세요.\n선택 후 형광펜으로 강조할 수 있습니다.'}
              style={{
                fontSize: `${fontSize}px`,
                background: activePanel === 1 ? 'rgba(29,185,84,0.03)' : '#0f0f13',
                borderRight: `1px solid ${activePanel === 1 ? 'rgba(29,185,84,0.2)' : '#2d2d3e'}`,
                transition: 'background 0.2s, border-color 0.2s',
              }}
              className="flex-1 p-5 text-white leading-relaxed focus:outline-none overflow-y-auto"
            />
            <div
              ref={lyricsRef2}
              contentEditable suppressContentEditableWarning spellCheck={false}
              onFocus={() => setActivePanel(2)}
              data-placeholder={'B 패널\n\n가사를 붙여넣거나 직접 입력하세요.\n선택 후 형광펜으로 강조할 수 있습니다.'}
              style={{
                fontSize: `${fontSize}px`,
                background: activePanel === 2 ? 'rgba(29,185,84,0.03)' : '#0f0f13',
                transition: 'background 0.2s',
              }}
              className="flex-1 p-5 text-white leading-relaxed focus:outline-none overflow-y-auto"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
