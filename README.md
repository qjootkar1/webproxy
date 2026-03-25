# nadeko.tv — Invidious 클라이언트

inv.nadeko.net 기반의 빠르고 깔끔한 YouTube 프라이버시 클라이언트.

## 특징

- **광고 없음** — YouTube 추적·광고 없이 영상 시청
- **빠른 로딩** — ISR(Incremental Static Regeneration) + Vercel Edge 캐싱
- **API 프록시** — CORS 우회, 서버사이드에서 Invidious API 호출
- **자동 폴백** — 인스턴스 장애 시 백업 인스턴스로 자동 전환
- **반응형** — 모바일/태블릿/데스크탑 완벽 지원

## 로컬 개발

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Vercel 배포

### 방법 1: Vercel CLI (권장)

```bash
npm i -g vercel
vercel login
vercel --prod
```

### 방법 2: GitHub 연동

1. GitHub 저장소에 push
2. https://vercel.com/new 에서 import
3. Framework: Next.js (자동 감지)
4. Deploy 클릭 → 완료!

## 페이지 구조

| 경로 | 설명 | 캐시 |
|------|------|------|
| `/` | 홈 (트렌딩/인기) | ISR 5분 |
| `/trending` | 트렌딩 (지역·카테고리 필터) | ISR 5분 |
| `/search?q=...` | 검색 결과 | CSR |
| `/watch/[videoId]` | 영상 시청 | SSR + CDN 1시간 |

## API 라우트

| 경로 | 설명 | 캐시 |
|------|------|------|
| `/api/trending` | 트렌딩 영상 | 5분 |
| `/api/popular` | 인기 영상 | 10분 |
| `/api/search` | 검색 | 2분 |
| `/api/video/[id]` | 영상 상세 | 1시간 |

## 인스턴스 폴백 순서

1. `https://inv.nadeko.net` (기본, Chile)
2. `https://invidious.privacydev.net`
3. `https://yt.artemislena.eu`

`lib/api.js`의 `INSTANCES` 배열을 수정해 변경 가능.
