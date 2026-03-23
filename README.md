# SwiftProxy 🚀

무료 익명 웹 프록시 — Vercel 배포용

## 📁 프로젝트 구조

```
swiftproxy/
├── api/
│   └── proxy.js          ← 핵심 프록시 서버리스 함수
├── public/
│   └── index.html        ← 프론트엔드 UI
├── vercel.json           ← Vercel 라우팅 설정
├── package.json
└── README.md
```

## 🚀 Vercel 배포 방법 (5분 완성)

### 방법 1: GitHub + Vercel (추천)

1. **GitHub에 업로드**
   ```bash
   git init
   git add .
   git commit -m "Initial SwiftProxy"
   git remote add origin https://github.com/YOUR_USERNAME/swiftproxy.git
   git push -u origin main
   ```

2. **Vercel 연결**
   - https://vercel.com 접속 → "New Project"
   - GitHub 저장소 선택
   - "Deploy" 클릭 (설정 변경 없이)
   - 완료! 자동으로 `https://swiftproxy-xxx.vercel.app` URL 발급

### 방법 2: Vercel CLI 직접 배포

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 방법 3: Vercel 드래그앤드롭

- https://vercel.com/new 접속
- 프로젝트 폴더를 드래그앤드롭

---

## ⚙️ 작동 방식

```
사용자 입력 URL
      ↓
/api/proxy?url=인코딩된URL (Vercel 서버리스 함수)
      ↓
대상 사이트 fetch (서버에서)
      ↓
HTML 내 모든 링크/이미지/스크립트 URL → /api/proxy?url=... 로 재작성
      ↓
사용자 브라우저에 반환
```

## 🔧 커스터마이징

### 차단 목록 추가 (api/proxy.js)
```javascript
const BLOCKED_SITES = ['malware.com', 'phishing.net'];

// handler 함수 상단에 추가:
if (BLOCKED_SITES.some(s => targetUrl.hostname.includes(s))) {
  return res.status(403).json({ error: 'Blocked' });
}
```

### 커스텀 도메인 연결
Vercel 대시보드 → Settings → Domains → 도메인 추가

---

## ⚠️ 주의사항

- Vercel 무료 플랜: 함수 실행 10초 제한, 월 100GB 대역폭
- 일부 사이트(Google, Netflix 등)는 프록시를 차단할 수 있음
- 합법적인 용도로만 사용할 것

## 📄 라이선스

MIT
