// 빌드 타임에 메인 페이지(/)를 정적 HTML로 프리렌더링한다.
// vite build --ssr로 만든 dist-ssr/entry-server.js의 render()를 호출해
// dist/index.html의 <div id="root"></div> 안에 실제 렌더링 결과를 주입하고,
// 임시로 사용한 dist-ssr는 정리한다. (main.jsx는 hydrateRoot로 이어받음)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const ssrEntry = path.join(ssrDir, 'entry-server.js')
const indexPath = path.join(distDir, 'index.html')

if (!fs.existsSync(ssrEntry)) {
  console.error(`[prerender] SSR 번들을 찾을 수 없습니다: ${ssrEntry}`)
  process.exit(1)
}
if (!fs.existsSync(indexPath)) {
  console.error(`[prerender] 클라이언트 빌드 결과를 찾을 수 없습니다: ${indexPath}`)
  process.exit(1)
}

const { render } = await import(pathToFileURL(ssrEntry).href)
const appHtml = render()

const template = fs.readFileSync(indexPath, 'utf-8')
if (!template.includes('<div id="root"></div>')) {
  console.error('[prerender] index.html에서 <div id="root"></div>을 찾지 못했습니다.')
  process.exit(1)
}

const finalHtml = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
fs.writeFileSync(indexPath, finalHtml)
fs.rmSync(ssrDir, { recursive: true, force: true })

console.log(`[prerender] ${path.relative(root, indexPath)}에 정적 마크업 ${appHtml.length}자 주입 완료`)
