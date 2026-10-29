// 빌드 타임 정적 HTML 생성기.
//
// 1) 메인 페이지(/) — vite build --ssr로 만든 dist-ssr/entry-server.js의 render()를 호출해
//    dist/index.html의 <div id="root"></div> 안에 렌더링 결과를 주입한다.
//    (main.jsx는 hydrateRoot로 이어받음)
// 2) 기능 소개 페이지 — scripts/seo-pages.mjs의 정의로 dist/<slug>/index.html을 만든다.
//    앱 번들을 로드하지 않는 순수 정적 HTML이라 JS 없이도 본문이 읽힌다.
// 3) dist/sitemap.xml을 빌드 날짜 기준으로 다시 쓴다.
//
// 마지막에 생성 결과(본문 분량, 필수 메타 태그, 메인 페이지의 내부 링크)를 검증하고,
// 하나라도 어긋나면 0이 아닌 코드로 종료해 잘못된 산출물이 배포되지 않게 한다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { PAGES, renderPageHtml, renderSitemap } from './seo-pages.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const ssrEntry = path.join(ssrDir, 'entry-server.js')
const indexPath = path.join(distDir, 'index.html')

// 본문으로 인정할 최소 글자 수 (요구 사항: 500자 이상)
const MIN_BODY_TEXT = 500

const fail = (msg) => {
  console.error(`[prerender] ${msg}`)
  process.exit(1)
}

if (!fs.existsSync(ssrEntry)) fail(`SSR 번들을 찾을 수 없습니다: ${ssrEntry}`)
if (!fs.existsSync(indexPath)) fail(`클라이언트 빌드 결과를 찾을 수 없습니다: ${indexPath}`)

// ── 1) 메인 페이지 프리렌더 ──
const { render } = await import(pathToFileURL(ssrEntry).href)
const appHtml = render()

const template = fs.readFileSync(indexPath, 'utf-8')
if (!template.includes('<div id="root"></div>')) {
  fail('index.html에서 <div id="root"></div>을 찾지 못했습니다.')
}

const finalHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
fs.writeFileSync(indexPath, finalHtml)
fs.rmSync(ssrDir, { recursive: true, force: true })

console.log(`[prerender] ${path.relative(root, indexPath)}에 정적 마크업 ${appHtml.length}자 주입 완료`)

// ── 2) 기능 소개 페이지 ──
// <main> 안의 텍스트만 뽑아 실제 본문 분량을 센다. (스크립트/스타일/태그 제외)
function extractMainText(html) {
  const main = html.match(/<main[\s\S]*?<\/main>/i)
  if (!main) return ''
  return main[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const problems = []

for (const page of PAGES) {
  const html = renderPageHtml(page)
  const outDir = path.join(distDir, page.slug)
  const outPath = path.join(outDir, 'index.html')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(outPath, html)

  // 디스크에 쓰인 결과를 다시 읽어 검증한다.
  const written = fs.readFileSync(outPath, 'utf-8')
  const bodyText = extractMainText(written)
  const checks = [
    [`<title>${page.title}</title>`, '<title>'],
    [`<link rel="canonical" href="https://cpplay.org/${page.slug}" />`, 'canonical'],
    ['property="og:title"', 'og:title'],
    ['property="og:description"', 'og:description'],
    ['property="og:url"', 'og:url'],
    ['property="og:image"', 'og:image'],
    ['"@type": "FAQPage"', 'FAQPage JSON-LD'],
    [`<h1>${page.h1}</h1>`, 'H1'],
    ['지금 바로 사용하기', '"지금 바로 사용하기" 버튼'],
  ]
  for (const [needle, label] of checks) {
    if (!written.includes(needle)) problems.push(`/${page.slug}: ${label}이(가) 없습니다.`)
  }

  // 검색 결과에서 잘리지 않을 길이인지 (title 40자, description 120자 내외)
  if (page.title.length > 45) problems.push(`/${page.slug}: title이 ${page.title.length}자입니다. (45자 이하)`)
  if (page.description.length < 100 || page.description.length > 135) {
    problems.push(`/${page.slug}: description이 ${page.description.length}자입니다. (100~135자)`)
  }

  const h1Count = (written.match(/<h1[\s>]/g) || []).length
  const h2Count = (written.match(/<h2[\s>]/g) || []).length
  if (h1Count !== 1) problems.push(`/${page.slug}: H1이 ${h1Count}개입니다. (1개여야 함)`)
  if (h2Count < 2) problems.push(`/${page.slug}: H2가 ${h2Count}개입니다. (2개 이상이어야 함)`)
  if (page.faq.length < 3) problems.push(`/${page.slug}: FAQ가 ${page.faq.length}개입니다. (3개 이상)`)
  if (bodyText.length < MIN_BODY_TEXT) {
    problems.push(`/${page.slug}: 본문이 ${bodyText.length}자입니다. (${MIN_BODY_TEXT}자 이상 필요)`)
  }
  // 앱 번들을 끌어오지 않는 정적 페이지여야 한다.
  if (/<script\s+type="module"/i.test(written)) {
    problems.push(`/${page.slug}: 모듈 스크립트가 포함돼 JS 의존 페이지가 되었습니다.`)
  }

  console.log(
    `[prerender] ${path.relative(root, outPath)} 생성 — 본문 ${bodyText.length}자, H2 ${h2Count}개, FAQ ${page.faq.length}개`,
  )
}

// ── 3) sitemap.xml (lastmod = 빌드 날짜) ──
const buildDate = new Date().toISOString().slice(0, 10)
const sitemapPath = path.join(distDir, 'sitemap.xml')
fs.writeFileSync(sitemapPath, renderSitemap(buildDate))
const sitemap = fs.readFileSync(sitemapPath, 'utf-8')
for (const page of PAGES) {
  if (!sitemap.includes(`https://cpplay.org/${page.slug}`)) {
    problems.push(`sitemap.xml에 /${page.slug} 경로가 없습니다.`)
  }
}
console.log(`[prerender] ${path.relative(root, sitemapPath)} 생성 — lastmod ${buildDate}, URL ${PAGES.length + 1}개`)

// ── 4) 메인 페이지가 세 페이지를 링크하는지 확인 (내부 링크) ──
const mainHtml = fs.readFileSync(indexPath, 'utf-8')
for (const page of PAGES) {
  if (!mainHtml.includes(`href="/${page.slug}"`)) {
    problems.push(`메인 페이지(dist/index.html)에 /${page.slug} 링크가 없습니다.`)
  }
}

if (problems.length > 0) {
  console.error('[prerender] 검증 실패:')
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log('[prerender] 검증 통과 — 모든 페이지에 본문·메타·링크가 들어갔습니다.')
