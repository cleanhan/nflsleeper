# 🏈 Sleeper League Pulse (Next.js 15 & Vercel Ready)

Sleeper 판타지 미식축구 리그 실시간 종합 분석 대시보드 & Gemini 3 Flash 주간 리포트 플랫폼입니다.
GitHub 저장소에 푸시하고 Vercel에 단 한 번의 클릭으로 배포할 수 있도록 최적화되어 있습니다.

## 🚀 빠른 시작 (Local Development)

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 🛡️ Vercel 배포 시 환경 변수 설정
Vercel 대시보드의 **Settings -> Environment Variables**에 다음 키를 등록하세요:
- `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/)에서 발급받은 실제 API 키