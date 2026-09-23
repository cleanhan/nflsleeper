import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 4;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

const recapResponseCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
               req.headers.get('x-real-ip') || 
               'anonymous_ip';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: '요청 한도를 초과했습니다. 1분 뒤 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { leagueId, week, leagueName, teamsSummary, tone = 'banter' } = body;

    if (!leagueId || !teamsSummary) {
      return NextResponse.json(
        { error: '필수 리그 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const cacheKey = `${leagueId}_week_${week}_tone_${tone}`;
    const cached = recapResponseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const fallbackResult = generateSmartFallback(leagueName, week, teamsSummary);
      return NextResponse.json({
        ...fallbackResult,
        _notice: 'Vercel 환경변수에 GEMINI_API_KEY가 등록되지 않아 기본 엔진으로 응답했습니다.'
      });
    }

    const systemPrompt = `당신은 판타지 스포츠 리그 전담 유머러스한 스포츠 저널리스트입니다.
제공된 판타지 미식축구 리그 데이터를 바탕으로 위트 넘치고 날카로운 단톡방 공유용 주간 리포트를 작성하세요.
JSON 응답 형식을 철저히 준수해야 합니다.`;

    const userPrompt = `
리그명: ${leagueName}
주차: Week ${week}
팀별 전력 및 득점 요약:
${JSON.stringify(teamsSummary, null, 2)}
스타일 톤: ${tone} (banter: 매운맛 풍자, sports: 정통 스포츠 기사)

다음 JSON 형식으로만 응답하세요:
{
  "headline": "도발적이고 센스 있는 메인 뉴스 헤드라인 (문자열)",
  "subheadline": "주간 결산 한 줄 서브타이틀 (문자열)",
  "mvpManager": "주간 MVP 구단주명 (최고점+최적라인업)",
  "clownManager": "주간 벤치 방치 또는 참사 구단주명",
  "luckyWinner": "운 좋게 꿀승리를 챙긴 구단주명",
  "unluckyLoser": "고득점 내고도 패배한 비운의 구단주명",
  "articleParagraphs": ["단락 1 (본문)", "단락 2 (본문)", "단락 3 (본문)"],
  "oneLiners": [
    {"team": "팀명", "roast": "해당 구단주를 향한 촌철살인 한 줄 평"}
  ]
}
`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (!response.ok) {
      return NextResponse.json(generateSmartFallback(leagueName, week, teamsSummary));
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return NextResponse.json(generateSmartFallback(leagueName, week, teamsSummary));

    const parsedResult = JSON.parse(rawJson);
    recapResponseCache.set(cacheKey, { data: parsedResult, expiresAt: Date.now() + CACHE_TTL });
    return NextResponse.json(parsedResult);
  } catch (error: unknown) {
    console.error('Recap API Handler Exception:', error);
    return NextResponse.json(
      { error: '주간 리포트 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

function generateSmartFallback(leagueName: string, week: number, teamsSummary: Array<{ name: string; wins: number; losses: number; pf: number; luck: number }>) {
  const sortedByPf = [...(teamsSummary || [])].sort((a, b) => b.pf - a.pf);
  const topTeam = sortedByPf[0]?.name || "선두팀";
  const bottomTeam = sortedByPf[sortedByPf.length - 1]?.name || "최하위팀";

  return {
    headline: `"${topTeam}"의 독주 폭격 쇼… "${bottomTeam}"은 기우제 모드 돌입!`,
    subheadline: `Week ${week} 정규시즌 분석: 운과 실력이 엇갈린 판타지 대혈투`,
    mvpManager: `${topTeam} (화력 1위)`,
    clownManager: `${bottomTeam} (선발 라인업 낭패)`,
    luckyWinner: `${sortedByPf[1]?.name || 'Apex Predators'}`,
    unluckyLoser: `${sortedByPf[Math.max(0, sortedByPf.length - 2)]?.name || 'Gravel Pit'}`,
    articleParagraphs: [
      `이번 주차는 리그 상위권의 저력과 하위권의 절박함이 정면충돌한 한 주였습니다. ${topTeam} 구단주는 탄탄한 주전 라인업을 앞세워 리그 최다 득점을 폭발시켰습니다.`,
      `반면 ${bottomTeam} 구단주는 벤치 자원들의 득점 폭발을 지켜보며 뼈아픈 패배를 당했습니다. 단톡방에서는 '선발 명단 작성 자격 정지'를 요구하는 아우성이 빗발쳤습니다.`,
      `플레이오프 진출권(상위 6팀)을 둘러싼 승차 싸움이 치열해지며, 다음 주차 모든 매치업이 사실상의 단두대 매치가 될 전망입니다.`
    ],
    oneLiners: (teamsSummary || []).slice(0, 10).map(t => ({
      team: t.name,
      roast: `${t.wins}승 ${t.losses}패 기록 중. ${t.pf > 1200 ? '폭발적인 득점력' : '라인업 점검 시급'}`
    }))
  };
}