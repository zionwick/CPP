const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const W = 1200
const H = 630
const canvas = createCanvas(W, H)
const ctx = canvas.getContext('2d')

// ── 배경 ──────────────────────────────────────────────────
ctx.fillStyle = '#0f0f13'
ctx.fillRect(0, 0, W, H)

// ── 보라 포인트 장식 ──────────────────────────────────────
// 왼쪽 원형 글로우
ctx.save()
const lgLeft = ctx.createRadialGradient(0, H / 2, 0, 0, H / 2, 320)
lgLeft.addColorStop(0, 'rgba(124,58,237,0.22)')
lgLeft.addColorStop(1, 'rgba(124,58,237,0)')
ctx.fillStyle = lgLeft
ctx.fillRect(0, 0, W, H)
ctx.restore()

// 오른쪽 원형 글로우
ctx.save()
const lgRight = ctx.createRadialGradient(W, H / 2, 0, W, H / 2, 320)
lgRight.addColorStop(0, 'rgba(124,58,237,0.22)')
lgRight.addColorStop(1, 'rgba(124,58,237,0)')
ctx.fillStyle = lgRight
ctx.fillRect(0, 0, W, H)
ctx.restore()

// 왼쪽 세로 선
ctx.strokeStyle = 'rgba(124,58,237,0.4)'
ctx.lineWidth = 2
ctx.beginPath()
ctx.moveTo(60, 80)
ctx.lineTo(60, H - 80)
ctx.stroke()

// 오른쪽 세로 선
ctx.beginPath()
ctx.moveTo(W - 60, 80)
ctx.lineTo(W - 60, H - 80)
ctx.stroke()

// 왼쪽 상단 작은 사각형 장식
ctx.fillStyle = '#7c3aed'
ctx.fillRect(60, 80, 30, 4)
ctx.fillRect(60, H - 84, 30, 4)
ctx.fillRect(W - 90, 80, 30, 4)
ctx.fillRect(W - 90, H - 84, 30, 4)

// ── 중앙 초록 하이라이트 라인 ─────────────────────────────
ctx.fillStyle = 'rgba(29,185,84,0.06)'
ctx.fillRect(0, H / 2 - 130, W, 260)

// ── CPP 텍스트 (상단) ─────────────────────────────────────
ctx.save()
ctx.font = 'bold 160px "Arial Black", Arial, sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'

// 글로우 효과
ctx.shadowColor = '#1DB954'
ctx.shadowBlur = 40
ctx.fillStyle = '#1DB954'
ctx.fillText('CPP', W / 2, 210)
ctx.shadowBlur = 0
ctx.restore()

// ── CopyPractice Player ───────────────────────────────────
ctx.save()
ctx.font = 'bold 52px Arial, sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillStyle = '#ffffff'
ctx.letterSpacing = '4px'
ctx.fillText('CopyPractice Player', W / 2, 370)
ctx.restore()

// ── 구분선 ────────────────────────────────────────────────
ctx.strokeStyle = 'rgba(255,255,255,0.08)'
ctx.lineWidth = 1
ctx.beginPath()
ctx.moveTo(W / 2 - 280, 420)
ctx.lineTo(W / 2 + 280, 420)
ctx.stroke()

// ── 하단 설명 텍스트 ──────────────────────────────────────
ctx.save()
ctx.font = '28px Arial, sans-serif'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillStyle = 'rgba(167,139,250,0.85)'
ctx.fillText('구간반복  ·  속도조절  ·  가사패널  ·  무료', W / 2, 475)
ctx.restore()

// ── URL ───────────────────────────────────────────────────
ctx.save()
ctx.font = '20px "Courier New", monospace'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillStyle = 'rgba(255,255,255,0.2)'
ctx.fillText('cpp-5ud.pages.dev', W / 2, 560)
ctx.restore()

// ── PNG 저장 ─────────────────────────────────────────────
const outPath = path.join(__dirname, '../public/og-image.png')
const buf = canvas.toBuffer('image/png')
fs.writeFileSync(outPath, buf)
console.log(`✅  저장 완료: ${outPath}  (${(buf.length / 1024).toFixed(1)} KB)`)
