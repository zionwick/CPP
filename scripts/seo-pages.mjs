// SEO용 기능 소개 페이지 정의 + 정적 HTML 렌더러.
// scripts/prerender.mjs가 이 모듈을 읽어 dist/<slug>/index.html과 dist/sitemap.xml을 만든다.
// 이 페이지들은 JS 없이도 본문이 읽히는 순수 정적 HTML이다. (앱 번들을 로드하지 않음)

export const SITE_ORIGIN = 'https://cpplay.org'

// 메인 앱(/)과 각 소개 페이지에서 공통으로 쓰는 네비게이션 라벨
export const NAV_LABELS = {
  'youtube-loop': '구간 반복',
  'slow-down': '속도 조절',
  'lyrics-practice': '가사 연습',
}

export const PAGES = [
  {
    slug: 'youtube-loop',
    title: '유튜브 구간 반복 재생 – A-B 구간만 무한 반복 | CPP',
    description:
      '유튜브 영상이나 내 음원에서 A·B 두 지점을 찍어 그 사이만 끊김 없이 반복 재생합니다. 손이 꼬이는 두세 마디, 고음 한 소절만 골라 연습하세요. 설치와 로그인 없이 브라우저에서 바로 쓰는 무료 연습 도구입니다.',
    h1: '유튜브 구간 반복 재생: A-B 반복으로 원하는 부분만 연습',
    intro: [
      '한 곡을 처음부터 끝까지 다시 듣는 대신, 자꾸 막히는 네 마디만 골라 계속 돌려 듣고 싶을 때가 있습니다. CopyPractice Player는 유튜브 영상이나 내 컴퓨터에 있는 음원에서 시작점 A와 끝점 B를 찍어 그 사이만 반복해 주는 웹 플레이어입니다.',
      '설치나 로그인, 회원가입이 없습니다. 브라우저에서 주소를 열고 영상 링크를 붙여넣으면 바로 연습을 시작할 수 있습니다.',
    ],
    sections: [
      {
        h2: '구간 반복을 설정하는 방법',
        steps: [
          '상단 입력창에 유튜브 주소를 붙여넣고 재생 버튼을 누릅니다. 컴퓨터에 있는 MP3나 영상 파일은 왼쪽의 로컬 파일 버튼으로 불러옵니다.',
          '반복할 구간이 시작되는 지점에서 “A 시작” 버튼을 누릅니다. 타임라인에 A 표식이 생깁니다.',
          '구간이 끝나는 지점에서 “B 끝” 버튼을 누릅니다.',
          '“반복” 버튼을 누르면 재생 위치가 A로 돌아가고, 이후 B에 닿을 때마다 자동으로 A로 되돌아옵니다.',
          '지점을 다듬고 싶으면 스킵 단위를 1초로 두고 좌우 이동 버튼으로 조금씩 옮긴 뒤 A나 B를 다시 찍습니다. ✕ 버튼을 누르면 구간이 해제되고 전체 재생으로 돌아갑니다.',
        ],
        after: [
          '한 번 연 영상은 영상 기록 목록에 남기 때문에, 어제 연습하던 곡을 다시 찾아 붙여넣을 필요 없이 목록에서 바로 불러올 수 있습니다.',
        ],
      },
      {
        h2: '이런 연습에 특히 잘 맞습니다',
        paragraphs: [
          '기타 솔로나 베이스 라인처럼 손이 꼬이는 두세 마디는, 곡 전체를 다시 듣는 시간보다 그 자리를 몇 번 더 지나가는 쪽이 훨씬 빠르게 익습니다. 구간을 좁게 잡아두면 한 번 재생할 때마다 문제가 되는 지점만 반복해서 만날 수 있습니다.',
          '보컬이라면 고음으로 넘어가는 한 소절, 숨을 쉬는 자리, 발음이 뭉개지는 부분을 떼어내 듣고 따라 부르기에 좋습니다. 원곡의 호흡 위치를 귀로 확인하면서 같은 자리를 반복하면 어디서 힘이 빠지는지 금방 드러납니다.',
          '외국어 노래나 랩은 받아쓰기처럼 쓸 수 있습니다. 같은 두 소절을 여러 번 들으며 들리는 대로 적고, 가사 패널에 옮겨 적은 뒤 안 들리던 부분만 다시 반복하는 식입니다.',
          '춤이나 악기 커버 영상을 분석할 때도 같은 방식이 통합니다. 동작이 바뀌는 순간을 A와 B로 감싸두면 그 짧은 전환만 몇 번이고 다시 볼 수 있습니다.',
        ],
      },
    ],
    faq: [
      {
        q: '유튜브 영상도 구간 반복이 되나요?',
        a: '됩니다. 유튜브 주소를 붙여넣으면 플레이어 위에서 A·B 지점을 지정할 수 있고, 재생 위치가 B에 닿을 때마다 A로 되돌려 재생합니다. 영상을 내려받지 않으므로 따로 프로그램을 설치할 필요가 없습니다.',
      },
      {
        q: '반복 구간을 더 정밀하게 맞출 수 있나요?',
        a: '스킵 단위를 1초로 두면 좌우 이동 버튼을 누를 때마다 1초씩 움직이며 지점을 다듬을 수 있습니다. 박자 하나가 아쉬울 때는 재생 속도를 0.5배로 낮춘 뒤 A와 B를 다시 찍는 편이 더 정확합니다.',
      },
      {
        q: '설정한 구간이 다음에도 남아 있나요?',
        a: 'A·B 지점은 저장되지 않아 영상을 다시 열면 새로 찍어야 합니다. 다만 최근에 연 영상 목록은 브라우저에 남기 때문에, 연습하던 곡 자체는 기록에서 바로 다시 불러올 수 있습니다.',
      },
    ],
  },

  {
    slug: 'slow-down',
    title: '유튜브·MP3 속도 조절 0.25배속 느리게 연습 | CPP',
    description:
      '유튜브나 MP3를 0.25·0.5·0.75배속으로 늦춰 빠른 구간을 천천히 연습합니다. 음정은 그대로 유지되고, A-B 구간 반복과 함께 쓰면 어려운 자리만 느리게 돌려 들을 수 있습니다. 설치 없이 무료로 사용하세요.',
    h1: '유튜브·MP3 속도 조절 0.25배속: 빠른 구간 천천히 연습',
    intro: [
      '빠른 패시지는 의지가 부족해서 안 되는 게 아니라, 손이 따라갈 수 없는 속도로 계속 연습해서 안 되는 경우가 많습니다. CopyPractice Player는 유튜브 영상과 로컬 음원의 재생 속도를 0.25배까지 낮춰, 들리는 음을 하나씩 확인하며 따라갈 수 있게 해 줍니다.',
      '속도를 낮춰도 음정은 그대로 유지되므로, 원곡과 다른 조성으로 연습하게 되는 일은 없습니다.',
    ],
    sections: [
      {
        h2: '속도를 낮춰 연습하는 방법',
        steps: [
          '유튜브 주소를 붙여넣거나 로컬 파일 버튼으로 MP3·영상 파일을 불러옵니다.',
          '플레이어 아래 속도 버튼에서 0.25x, 0.5x, 0.75x, 1.0x 중 하나를 고릅니다. 재생 중에 눌러도 끊기지 않고 바로 반영됩니다.',
          '먼저 0.5배속으로 한 번 통과해 보고, 그래도 놓치는 자리가 있으면 0.25배속까지 내려 음을 하나씩 확인합니다.',
          '어려운 자리는 A·B로 구간을 잡아 느린 속도로 여러 번 반복합니다.',
          '해당 구간이 안정되면 0.75배, 1.0배로 한 단계씩 올려 원래 속도까지 끌어올립니다.',
        ],
        after: [
          '속도를 올리다가 다시 틀리기 시작하면 한 단계 내려가는 편이 좋습니다. 틀린 운지나 발음을 빠른 속도로 반복하면 그 상태가 그대로 굳습니다.',
        ],
      },
      {
        h2: '느린 재생이 도움이 되는 상황',
        paragraphs: [
          '기타나 피아노의 빠른 프레이즈는 0.5배속에서 운지와 손가락 순서를 눈으로 확인할 수 있습니다. 영상이라면 연주자의 손 모양까지 함께 볼 수 있어, 악보만 보고 추측하던 부분이 분명해집니다.',
          '랩이나 빠른 가사는 0.25배속에서 음절이 하나씩 떨어져 들립니다. 한 번에 다 적으려 하지 않고 들리는 단어부터 채워 넣은 뒤 속도를 올리면 나머지가 메워집니다.',
          '드럼 필인이나 복잡한 리듬은 느린 속도에서 음 사이의 간격이 드러납니다. 셋잇단인지 열여섯 비트인지 귀로 가늠하기 어려웠던 부분을 세어 볼 수 있습니다.',
          '외국어 듣기 연습도 같습니다. 원어민의 축약된 발음은 속도를 낮추면 단어 경계가 들리기 시작하고, 익숙해진 다음 원래 속도로 돌아가면 같은 문장이 전보다 느리게 느껴집니다.',
        ],
      },
    ],
    faq: [
      {
        q: '속도를 낮추면 음정도 같이 낮아지나요?',
        a: '아닙니다. 브라우저 플레이어가 음정을 유지한 채 속도만 바꾸기 때문에, 0.25배속에서도 원곡과 같은 조성으로 들립니다. 따라 부르거나 악기로 따라 칠 때 음을 다시 옮겨 생각할 필요가 없습니다.',
      },
      {
        q: '어떤 속도부터 시작하는 게 좋나요?',
        a: '0.5배속에서 시작해 한 구간을 실수 없이 통과할 수 있는지 보는 방식을 권합니다. 그래도 벅차면 0.25배속으로 내리고, 여유가 있으면 0.75배속으로 올립니다. 기준은 “틀리지 않고 지나갈 수 있는 가장 빠른 속도”입니다.',
      },
      {
        q: 'MP3 같은 내 음원 파일도 속도를 조절할 수 있나요?',
        a: '로컬 파일 버튼으로 MP3, WAV, M4A, FLAC 같은 음원이나 영상 파일을 불러오면 유튜브와 똑같이 속도 버튼이 적용됩니다. 파일은 서버로 올라가지 않고 브라우저 안에서만 재생됩니다.',
      },
    ],
  },

  {
    slug: 'lyrics-practice',
    title: '노래 가사 연습 – 가사 패널과 형광펜 활용법 | CPP',
    description:
      '플레이어 옆 가사 패널에 가사를 붙여넣고 네 가지 형광펜으로 표시하며 연습합니다. 두 패널을 나란히 띄워 원문과 해석을 비교하고, 제목을 붙여 저장하면 표시한 색까지 그대로 다시 불러올 수 있습니다.',
    h1: '가사 패널과 형광펜으로 노래 가사 연습',
    intro: [
      '노래를 연습할 때 가사는 보통 다른 창에 떠 있습니다. 재생을 멈추고 창을 바꾸고, 다시 돌아와 재생 위치를 찾는 동작이 반복되면 흐름이 끊깁니다. CopyPractice Player는 플레이어 바로 옆에 가사 패널을 두어 한 화면에서 듣고 읽고 표시할 수 있게 합니다.',
      '가사는 직접 입력하거나 붙여넣으면 되고, 글자 크기는 다섯 단계로 조절할 수 있어 마이크 앞에서 조금 떨어져 보더라도 읽을 수 있습니다.',
    ],
    sections: [
      {
        h2: '가사 패널 사용 방법',
        steps: [
          '오른쪽 가사 패널을 클릭하고 가사를 붙여넣거나 직접 입력합니다.',
          '글자 크기 버튼(XS~XL)으로 지금 보는 거리에 맞게 키웁니다.',
          '숨을 쉬는 자리, 음이 올라가는 자리처럼 기억해 둘 부분을 드래그한 뒤 형광펜 색을 누릅니다. 노랑·초록·분홍·하늘 네 가지를 용도별로 나눠 쓰면 구분이 쉽습니다.',
          '표시를 지울 때는 해당 부분을 다시 드래그하고 제거 버튼을 누릅니다.',
          '제목을 붙여 저장해 두면 저장된 가사 목록에서 언제든 다시 불러올 수 있습니다.',
        ],
        after: [
          '패널은 A와 B 두 개가 있어 한쪽만 보거나 둘을 나란히 띄울 수 있습니다. 원문과 번역, 1절과 2절, 가사와 메모처럼 비교하며 봐야 하는 내용을 양쪽에 나눠 두면 스크롤을 오가지 않아도 됩니다.',
        ],
      },
      {
        h2: '어떻게 쓰면 연습이 수월해지나요',
        paragraphs: [
          '형광펜을 색마다 역할을 정해 쓰면 가사가 연습 계획표가 됩니다. 예를 들어 분홍은 아직 못 외운 구절, 노랑은 호흡 지점, 하늘은 음정이 흔들리는 자리로 정해두면 다음 연습에서 어디부터 손대야 할지 바로 보입니다.',
          '외국어 노래는 두 패널을 함께 쓰기 좋습니다. 왼쪽에 원문 가사, 오른쪽에 발음이나 해석을 적어두고 구간 반복으로 같은 소절을 들으며 양쪽을 번갈아 확인하는 방식입니다.',
          '가사를 외우는 단계에서는 반대로 지우면서 연습할 수 있습니다. 외운 줄을 지워 가며 남은 부분만 보고 부르면, 어느 구절에서 기억이 끊기는지 스스로 확인하게 됩니다.',
          '저장된 가사 목록은 연습 중인 곡의 목록 역할도 합니다. 곡마다 표시해 둔 색이 그대로 남아 있어, 며칠 뒤에 다시 열어도 지난번에 어디를 어려워했는지 다시 떠올릴 필요가 없습니다.',
        ],
      },
    ],
    faq: [
      {
        q: '가사가 재생 시간에 맞춰 자동으로 넘어가나요?',
        a: '자동 스크롤이나 싱크 기능은 없습니다. 가사는 직접 입력하고 눈으로 따라 읽는 방식입니다. 대신 특정 소절을 집중해 연습할 때는 A-B 구간 반복으로 그 부분만 돌려 들으면서 같은 줄을 반복해 읽을 수 있습니다.',
      },
      {
        q: '입력한 가사는 어디에 저장되나요?',
        a: '제목을 붙여 저장하면 사용 중인 브라우저 안에 보관됩니다. 서버로 전송되지 않기 때문에 다른 기기에서는 보이지 않고, 브라우저 데이터를 지우면 함께 사라집니다. 중요한 메모는 따로 백업해 두는 편이 안전합니다.',
      },
      {
        q: '형광펜 표시도 같이 저장되나요?',
        a: '네, 색 표시가 들어간 상태로 저장되어 다시 불러오면 그대로 보입니다. 지난 연습에서 표시해 둔 어려운 구절을 다시 찾을 필요 없이 이어서 연습할 수 있습니다.',
      },
    ],
  },
]

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const PAGE_CSS = `
:root{--cp-bg:#0f0f13;--cp-panel:#16161d;--cp-panel-alt:#1e1e28;--cp-border:#2d2d3e;
--cp-text:#ffffff;--cp-text-muted:#a78bfa;--cp-accent:#1DB954;--cp-accent-text:#000000}
*{box-sizing:border-box}
body{margin:0;background:var(--cp-bg);color:var(--cp-text);
font-family:system-ui,-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;
font-size:16px;line-height:1.75;word-break:keep-all}
a{color:var(--cp-text-muted)}
.bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;
padding:14px 20px;border-bottom:1px solid var(--cp-border);background:var(--cp-panel)}
.brand{font-family:'Orbitron',sans-serif;font-weight:700;letter-spacing:.2em;
font-size:1.1rem;color:var(--cp-accent);text-decoration:none}
.bar nav{display:flex;gap:14px;flex-wrap:wrap;font-size:.85rem}
.cta{margin-left:auto;background:var(--cp-accent);color:var(--cp-accent-text);
text-decoration:none;font-weight:700;font-size:.9rem;padding:9px 18px;border-radius:8px;
white-space:nowrap}
main{max-width:760px;margin:0 auto;padding:36px 20px 72px}
h1{font-size:1.75rem;line-height:1.4;margin:0 0 20px}
h2{font-size:1.25rem;margin:44px 0 12px;padding-top:20px;
border-top:1px solid var(--cp-border)}
h3{font-size:1rem;margin:24px 0 6px;color:var(--cp-text-muted)}
p{margin:0 0 16px}
ol{padding-left:22px;margin:0 0 16px}
ol li{margin-bottom:10px}
.lead{color:#d8d4e8}
.hero-cta{display:inline-block;background:var(--cp-accent);color:var(--cp-accent-text);
text-decoration:none;font-weight:700;padding:13px 26px;border-radius:10px;margin:8px 0 28px}
.faq{background:var(--cp-panel);border:1px solid var(--cp-border);
border-radius:10px;padding:4px 22px 18px;margin-top:12px}
.faq h3{color:var(--cp-text)}
.faq p{color:#cfcbe0;margin-bottom:18px}
footer{border-top:1px solid var(--cp-border);padding:24px 20px 40px;
font-size:.85rem;color:#8d87a8;text-align:center}
footer nav{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:12px}
@media(max-width:560px){
h1{font-size:1.4rem}main{padding:24px 16px 56px}
.cta{margin-left:0;width:100%;text-align:center}}
`

function renderSection(section) {
  const parts = [`<h2>${esc(section.h2)}</h2>`]
  for (const p of section.paragraphs || []) parts.push(`<p>${esc(p)}</p>`)
  if (section.steps) {
    parts.push('<ol>')
    for (const s of section.steps) parts.push(`<li>${esc(s)}</li>`)
    parts.push('</ol>')
  }
  for (const p of section.after || []) parts.push(`<p>${esc(p)}</p>`)
  return parts.join('\n      ')
}

function renderFaqJsonLd(page) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
  // </script> 로 조기 종료되지 않도록 슬래시를 이스케이프
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c')
}

export function renderPageHtml(page) {
  const url = `${SITE_ORIGIN}/${page.slug}`
  const others = PAGES.filter((p) => p.slug !== page.slug)

  const navLinks = PAGES.map((p) =>
    p.slug === page.slug
      ? `<span aria-current="page" style="color:var(--cp-text)">${esc(NAV_LABELS[p.slug])}</span>`
      : `<a href="/${p.slug}">${esc(NAV_LABELS[p.slug])}</a>`,
  ).join('\n        ')

  const relatedLinks = others
    .map((p) => `<a href="/${p.slug}">${esc(p.h1)}</a>`)
    .join('\n      ')

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${url}" />
    <meta name="theme-color" content="#0f0f13" />

    <meta property="og:site_name" content="CopyPractice Player" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:image" content="${SITE_ORIGIN}/og-image.png" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(page.title)}" />
    <meta name="twitter:description" content="${esc(page.description)}" />
    <meta name="twitter:image" content="${SITE_ORIGIN}/og-image.png" />

    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet" />
    <style>${PAGE_CSS}</style>

    <script type="application/ld+json">
${renderFaqJsonLd(page)}
    </script>
  </head>
  <body>
    <div class="bar">
      <a class="brand" href="/">CPP</a>
      <nav aria-label="기능 소개">
        ${navLinks}
      </nav>
      <a class="cta" href="/">지금 바로 사용하기</a>
    </div>

    <main>
      <h1>${esc(page.h1)}</h1>
      ${page.intro.map((p) => `<p class="lead">${esc(p)}</p>`).join('\n      ')}
      <a class="hero-cta" href="/">지금 바로 사용하기</a>

      ${page.sections.map(renderSection).join('\n\n      ')}

      <h2>자주 묻는 질문</h2>
      <div class="faq">
        ${page.faq.map(({ q, a }) => `<h3>${esc(q)}</h3>\n        <p>${esc(a)}</p>`).join('\n        ')}
      </div>
    </main>

    <footer>
      <nav aria-label="관련 페이지">
        ${relatedLinks}
      </nav>
      <p><a href="/">CopyPractice Player로 돌아가기</a></p>
    </footer>
  </body>
</html>
`
}

export function renderSitemap(buildDate) {
  const entries = [
    { loc: `${SITE_ORIGIN}/`, changefreq: 'weekly', priority: '1.0' },
    ...PAGES.map((p) => ({
      loc: `${SITE_ORIGIN}/${p.slug}`,
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ]

  const urls = entries
    .map(
      ({ loc, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${buildDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}
