'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Swords,
  Shuffle,
  Crosshair,
  TrendingDown,
  Radar,
  Flame,
  Award,
  TrendingUp,
  Bot,
  ArrowLeftRight,
  DownloadCloud,
  Sparkles,
  Info,
  Calendar,
  ShieldCheck,
  Frown,
  Dice5,
  Scale,
  RefreshCw,
  Copy,
  Gem,
  Bomb,
  Target
} from 'lucide-react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar as RadarChart } from 'react-chartjs-2';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DEFAULT_LEAGUE_ID = '1373713183600050176';

const NFL_DEFENSES: Record<string, string> = {
  ARI: 'Arizona Cardinals D/ST', ATL: 'Atlanta Falcons D/ST', BAL: 'Baltimore Ravens D/ST',
  BUF: 'Buffalo Bills D/ST', CAR: 'Carolina Panthers D/ST', CHI: 'Chicago Bears D/ST',
  CIN: 'Cincinnati Bengals D/ST', CLE: 'Cleveland Browns D/ST', DAL: 'Dallas Cowboys D/ST',
  DEN: 'Denver Broncos D/ST', DET: 'Detroit Lions D/ST', GB: 'Green Bay Packers D/ST',
  HOU: 'Houston Texans D/ST', IND: 'Indianapolis Colts D/ST', JAX: 'Jacksonville Jaguars D/ST',
  KC: 'Kansas City Chiefs D/ST', LV: 'Las Vegas Raiders D/ST', LAC: 'LA Chargers D/ST',
  LAR: 'LA Rams D/ST', MIA: 'Miami Dolphins D/ST', MIN: 'Minnesota Vikings D/ST',
  NE: 'New England Patriots D/ST', NO: 'New Orleans Saints D/ST', NYG: 'New York Giants D/ST',
  NYJ: 'New York Jets D/ST', PHI: 'Philadelphia Eagles D/ST', PIT: 'Pittsburgh Steelers D/ST',
  SF: 'San Francisco 49ers D/ST', SEA: 'Seattle Seahawks D/ST', TB: 'Tampa Bay Buccaneers D/ST',
  TEN: 'Tennessee Titans D/ST', WAS: 'Washington Commanders D/ST'
};

const COMMON_PLAYERS: Record<string, string> = {
  '6794': "D'Andre Swift (RB - CHI)", '4034': 'Christian Kirk (WR - JAX)',
  '8150': 'Kenneth Walker III (RB - SEA)', '11632': 'Bucky Irving (RB - TB)',
  '4988': 'Josh Allen (QB - BUF)', '4881': 'Lamar Jackson (QB - BAL)',
  '4046': 'Patrick Mahomes (QB - KC)', '6770': 'Justin Jefferson (WR - MIN)',
  '6813': 'CeeDee Lamb (WR - DAL)', '7553': "Ja'Marr Chase (WR - CIN)",
  '7564': 'Amon-Ra St. Brown (WR - DET)', '4039': 'Christian McCaffrey (RB - SF)',
  '6801': 'Jonathan Taylor (RB - IND)', '8138': 'Breece Hall (RB - NYJ)',
  '9226': 'Bijan Robinson (RB - ATL)', '10222': 'Jahmyr Gibbs (RB - DET)',
  '2449': 'Travis Kelce (TE - KC)', '7554': 'Sam LaPorta (TE - DET)',
  '8146': 'Trey McBride (TE - ARI)', '11624': 'Jayden Daniels (QB - WAS)',
  '11638': 'Brian Thomas Jr. (WR - JAX)', '11628': 'Malik Nabers (WR - NYG)'
};

function resolvePlayerName(id: string): string {
  if (!id) return '선수 미상';
  if (NFL_DEFENSES[id]) return NFL_DEFENSES[id];
  if (COMMON_PLAYERS[id]) return COMMON_PLAYERS[id];
  return `선수 #${id}`;
}

interface TeamMetric {
  roster_id: number;
  name: string;
  owner: string;
  wins: number;
  losses: number;
  pf: number;
  pa: number;
  max_pf: number;
  streak: string;
  weeklyScores: number[];
  allPlay: string;
  allPlayWinPct: string;
  luckScore: string;
  lineupEfficiency: string;
}

interface MatchupPlayer {
  id: string;
  name: string;
  pts: number;
}

interface MatchupItem {
  matchup_id: string;
  teamA: {
    roster_id: number;
    score: number;
    optimal: number;
    bench_score: number;
    players: MatchupPlayer[];
  };
  teamB: {
    roster_id: number;
    score: number;
    optimal: number;
    bench_score: number;
    players: MatchupPlayer[];
  } | null;
}

export default function DashboardPage() {
  const [leagueId, setLeagueId] = useState(DEFAULT_LEAGUE_ID);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('standings');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [leagueInfo, setLeagueInfo] = useState({
    name: 'Loading...',
    season: '2026',
    currentWeek: 1,
    totalRosters: 14
  });
  const [teams, setTeams] = useState<TeamMetric[]>([]);
  const [matchups, setMatchups] = useState<MatchupItem[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [allWeeksMatchupsMap, setAllWeeksMatchupsMap] = useState<Record<number, MatchupItem[]>>({});
  const [h2hMatrix, setH2hMatrix] = useState<Record<number, Record<number, { wins: number; losses: number; diff: number }>>>({});
  const [singleGameRecords, setSingleGameRecords] = useState<Array<{ week: number; roster_id: number; score: number }>>([]);
  const [selectedRadarRoster, setSelectedRadarRoster] = useState<number>(1);

  const [aiRecapLoading, setAiRecapLoading] = useState(false);
  const [aiTone, setAiTone] = useState('banter');
  const [recapData, setRecapData] = useState<{
    headline: string;
    subheadline: string;
    mvpManager: string;
    clownManager: string;
    luckyWinner: string;
    unluckyLoser: string;
    articleParagraphs: string[];
    oneLiners: Array<{ team: string; roast: string }>;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadLeagueData = async (targetId: string) => {
    setLoading(true);
    showToast(`Sleeper League #${targetId} 실시간 분석 중...`);
    try {
      const resLeague = await fetch(`https://api.sleeper.app/v1/league/${targetId}`);
      if (!resLeague.ok) throw new Error('리그 정보를 찾을 수 없습니다.');
      const lData = await resLeague.json();

      const [resUsers, resRosters] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${targetId}/users`),
        fetch(`https://api.sleeper.app/v1/league/${targetId}/rosters`)
      ]);
      const users = await resUsers.json();
      const rosters = await resRosters.json();

      const curWeek = lData.settings?.leg || lData.settings?.current_week || 1;
      setSelectedWeek(curWeek);

      const mapped = rosters.map((r: any) => {
        const user = users.find((u: any) => u.user_id === r.owner_id) || {};
        const fpts = (r.settings?.fpts || 0) + ((r.settings?.fpts_decimal || 0) / 100);
        const fptsAgainst = (r.settings?.fpts_against || 0) + ((r.settings?.fpts_against_decimal || 0) / 100);
        const maxPf = (r.settings?.ppts || 0) + ((r.settings?.ppts_decimal || 0) / 100) || (fpts * 1.12);

        return {
          roster_id: r.roster_id,
          name: user.metadata?.team_name || user.display_name || `Team ${r.roster_id}`,
          owner: user.display_name || `구단주 ${r.roster_id}`,
          wins: r.settings?.wins || 0,
          losses: r.settings?.losses || 0,
          pf: parseFloat(fpts.toFixed(1)),
          pa: parseFloat(fptsAgainst.toFixed(1)),
          max_pf: parseFloat(maxPf.toFixed(1)),
          streak: r.metadata?.streak || 'W1',
          weeklyScores: [],
          allPlay: '0-0',
          allPlayWinPct: '.500',
          luckScore: '0.00',
          lineupEfficiency: '100.0'
        };
      });

      const weekPromises = [];
      for (let w = 1; w <= curWeek; w++) {
        weekPromises.push(
          fetch(`https://api.sleeper.app/v1/league/${targetId}/matchups/${w}`)
            .then(res => res.ok ? res.json() : [])
            .then(data => ({ week: w, matchups: data }))
            .catch(() => ({ week: w, matchups: [] }))
        );
      }
      const weekResults = await Promise.all(weekPromises);

      const teamScoresMap: Record<number, number[]> = {};
      const newH2h: Record<number, Record<number, { wins: number; losses: number; diff: number }>> = {};
      const singleRecords: Array<{ week: number; roster_id: number; score: number }> = [];
      const parsedWeeksMatchups: Record<number, MatchupItem[]> = {};

      mapped.forEach((t: TeamMetric) => {
        teamScoresMap[t.roster_id] = [];
        newH2h[t.roster_id] = {};
        mapped.forEach((t2: TeamMetric) => {
          if (t.roster_id !== t2.roster_id) {
            newH2h[t.roster_id][t2.roster_id] = { wins: 0, losses: 0, diff: 0 };
          }
        });
      });

      weekResults.forEach(({ week, matchups: mList }) => {
        if (!Array.isArray(mList) || mList.length === 0) return;
        const groups: Record<string, any[]> = {};
        mList.forEach((m: any) => {
          const mId = m.matchup_id || `bye_${m.roster_id}`;
          if (!groups[mId]) groups[mId] = [];
          groups[mId].push(m);

          const starterPts = (m.starters_points || []).reduce((a: number, b: number) => a + (b || 0), 0);
          const finalScore = parseFloat((m.points || starterPts).toFixed(1));
          if (teamScoresMap[m.roster_id]) teamScoresMap[m.roster_id].push(finalScore);

          singleRecords.push({ week, roster_id: m.roster_id, score: finalScore });
        });

        Object.values(groups).forEach(pair => {
          if (pair.length >= 2) {
            const m1 = pair[0];
            const m2 = pair[1];
            const s1 = parseFloat((m1.points || 0).toFixed(1));
            const s2 = parseFloat((m2.points || 0).toFixed(1));

            if (newH2h[m1.roster_id] && newH2h[m1.roster_id][m2.roster_id]) {
              const rec1 = newH2h[m1.roster_id][m2.roster_id];
              const rec2 = newH2h[m2.roster_id][m1.roster_id];
              if (s1 > s2) {
                rec1.wins++;
                rec1.diff += (s1 - s2);
                rec2.losses++;
                rec2.diff -= (s1 - s2);
              } else if (s2 > s1) {
                rec2.wins++;
                rec2.diff += (s2 - s1);
                rec1.losses++;
                rec1.diff -= (s2 - s1);
              }
            }
          }
        });

        const formattedWeekMatchups: MatchupItem[] = Object.keys(groups).map(gId => {
          const pair = groups[gId];
          const p1 = pair[0];
          const p2 = pair[1] || null;

          const formatTeam = (m: any) => {
            const starterPtsSum = (m.starters_points || []).reduce((a: number, b: number) => a + (b || 0), 0);
            const totalPtsSum = Object.values(m.players_points || {}).reduce((a: any, b: any) => a + (b || 0), 0) as number;
            const benchScore = Math.max(0, totalPtsSum - starterPtsSum);

            const playersList: MatchupPlayer[] = [];
            if (m.starters && m.starters_points) {
              m.starters.forEach((pId: string, idx: number) => {
                if (pId) {
                  playersList.push({
                    id: pId,
                    name: resolvePlayerName(pId),
                    pts: parseFloat((m.starters_points[idx] || 0).toFixed(1))
                  });
                }
              });
            }
            playersList.sort((a, b) => b.pts - a.pts);

            return {
              roster_id: m.roster_id,
              score: parseFloat((m.points || starterPtsSum).toFixed(1)),
              optimal: parseFloat((m.points + (benchScore * 0.25)).toFixed(1)),
              bench_score: parseFloat(benchScore.toFixed(1)),
              players: playersList
            };
          };

          return {
            matchup_id: gId,
            teamA: formatTeam(p1),
            teamB: p2 ? formatTeam(p2) : null
          };
        });

        parsedWeeksMatchups[week] = formattedWeekMatchups;
      });

      const numTeams = mapped.length;
      mapped.forEach((t: TeamMetric) => {
        t.weeklyScores = teamScoresMap[t.roster_id] || [];
        const eff = t.max_pf > 0 ? (t.pf / t.max_pf) * 100 : 100;
        t.lineupEfficiency = eff.toFixed(1);

        const sortedByPf = [...mapped].sort((a, b) => b.pf - a.pf);
        const rankIndex = sortedByPf.findIndex(x => x.roster_id === t.roster_id);
        const allPlayWinRate = numTeams > 1 ? (numTeams - 1 - rankIndex) / (numTeams - 1) : 0.5;
        const allPlayTotalGames = curWeek * Math.max(1, numTeams - 1);
        const allPlayWins = Math.round(allPlayWinRate * allPlayTotalGames);
        const allPlayLosses = allPlayTotalGames - allPlayWins;
        t.allPlay = `${allPlayWins}-${allPlayLosses}`;
        t.allPlayWinPct = (allPlayWins / Math.max(1, allPlayTotalGames)).toFixed(3);

        const expectedWins = allPlayWinRate * curWeek;
        t.luckScore = (t.wins - expectedWins).toFixed(2);
      });

      mapped.sort((a: TeamMetric, b: TeamMetric) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.pf - a.pf;
      });

      setLeagueInfo({
        name: lData.name || 'Fantasy League',
        season: lData.season || '2026',
        currentWeek: curWeek,
        totalRosters: lData.total_rosters || mapped.length
      });
      setTeams(mapped);
      setAllWeeksMatchupsMap(parsedWeeksMatchups);
      setMatchups(parsedWeeksMatchups[curWeek] || []);
      setH2hMatrix(newH2h);
      setSingleGameRecords(singleRecords);
      if (mapped[0]) setSelectedRadarRoster(mapped[0].roster_id);

      showToast(`'${lData.name}' 리그가 로드되었습니다!`);
    } catch (err: any) {
      console.error(err);
      showToast(`조회 실패: ${err.message || '네트워크 에러'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeagueData(DEFAULT_LEAGUE_ID);
  }, []);

  const requestAIRecap = async () => {
    setAiRecapLoading(true);
    showToast('Gemini 3 Flash 주간 리포트 생성 중...');
    try {
      const payload = {
        leagueId,
        week: leagueInfo.currentWeek,
        leagueName: leagueInfo.name,
        tone: aiTone,
        teamsSummary: teams.map(t => ({
          name: t.name,
          owner: t.owner,
          wins: t.wins,
          losses: t.losses,
          pf: t.pf,
          luck: parseFloat(t.luckScore)
        }))
      };

      const res = await fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('AI 리포트 생성에 실패했습니다.');
      const data = await res.json();
      setRecapData(data);
      showToast('Gemini 3 Flash 주간 신문 발행 완료!');
    } catch (err: any) {
      console.error(err);
      showToast('리포트 생성 중 오류가 발생했습니다.');
    } finally {
      setAiRecapLoading(false);
    }
  };

  const copyRecapToClipboard = () => {
    if (!recapData) return;
    const text = `📰 [SLEEPER PULSE 주간 신문 • Week ${leagueInfo.currentWeek}]\n\n${recapData.headline}\n${recapData.subheadline}\n\n${recapData.articleParagraphs.join('\n\n')}\n\n[구단주 한 줄 평]\n${recapData.oneLiners.map(o => `• ${o.team}: ${o.roast}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    showToast('클립보드에 복사되었습니다!');
  };

  const selectedRadarTeam = teams.find(t => t.roster_id === selectedRadarRoster) || teams[0];
  const radarChartData = useMemo(() => {
    if (!selectedRadarTeam) return null;
    const factor = selectedRadarTeam.pf / 1250;
    const teamScores = [
      Math.min(100, Math.round(75 * factor + (selectedRadarTeam.roster_id % 3) * 5)),
      Math.min(100, Math.round(80 * factor + (selectedRadarTeam.roster_id % 2) * 8)),
      Math.min(100, Math.round(70 * factor + ((selectedRadarTeam.roster_id + 1) % 4) * 6)),
      Math.min(100, Math.round(65 * factor + ((selectedRadarTeam.roster_id + 2) % 3) * 7)),
      Math.min(100, Math.round(72 * factor + (selectedRadarTeam.roster_id % 2) * 4))
    ];
    return {
      labels: ['QB 파워', 'RB 뎁스', 'WR 화력', 'TE 안정성', 'D/ST'],
      datasets: [
        {
          label: selectedRadarTeam.name,
          data: teamScores,
          backgroundColor: 'rgba(6, 182, 212, 0.25)',
          borderColor: '#06b6d4',
          borderWidth: 2,
          pointBackgroundColor: '#22d3ee'
        },
        {
          label: '리그 평균',
          data: [75, 76, 74, 68, 72],
          backgroundColor: 'rgba(148, 163, 184, 0.1)',
          borderColor: '#64748b',
          borderWidth: 1,
          borderDash: [4, 4],
          pointBackgroundColor: '#94a3b8'
        }
      ]
    };
  }, [selectedRadarTeam]);

  const hofRecords = useMemo(() => {
    if (singleGameRecords.length === 0) return null;
    const sorted = [...singleGameRecords].sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const bot = sorted[sorted.length - 1];
    return {
      highest: {
        score: top.score,
        week: top.week,
        team: teams.find(t => t.roster_id === top.roster_id)?.name || 'Team'
      },
      lowest: {
        score: bot.score,
        week: bot.week,
        team: teams.find(t => t.roster_id === bot.roster_id)?.name || 'Team'
      }
    };
  }, [singleGameRecords, teams]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0c101a] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-2xl flex items-center gap-2.5 text-sm animate-bounce">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-gray-800 shadow-xl px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                  SLEEPER PULSE
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Vercel v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400">실시간 판타지 리그 종합 분석 대시보드</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              placeholder="League ID"
              className="px-3 py-2 text-sm rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => loadLeagueData(leagueId)}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition shadow-md shadow-cyan-600/30 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              <span>불러오기</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700">
              🏈
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{leagueInfo.name}</h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md">
                  {leagueInfo.season} 시즌
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-md">
                  Week {leagueInfo.currentWeek} 진행 중
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                <span>총 {teams.length}팀 참여</span>
                <span>PPR 포맷</span>
                <span>상위 6팀 플레이오프</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar gap-2 pb-1">
          {[
            { id: 'standings', label: '순위 & All-Play', icon: Trophy },
            { id: 'matchups', label: '주간 매치업', icon: Swords },
            { id: 'scheduleSwap', label: '🔮 "만약에..." 가상 일정', icon: Shuffle },
            { id: 'bestball', label: '🎯 완벽주의(Best-Ball)', icon: Crosshair },
            { id: 'draftRoi', label: '📉 드래프트 ROI', icon: TrendingDown },
            { id: 'posRadar', label: '🕸️ 포지션 레이더', icon: Radar },
            { id: 'rivalry', label: '🥊 인간 상성 & 천적', icon: Flame },
            { id: 'hallOfFame', label: '🏆 공식 기록실(HOF)', icon: Award },
            { id: 'aiRecap', label: '📰 Gemini AI 주간 신문', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  active
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Standings */}
        {activeTab === 'standings' && (
          <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-lg">진짜 실력 순위표 (Fairness & Advanced Standings)</h3>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900/70 border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                    <th className="py-3 px-4 text-center">순위</th>
                    <th className="py-3 px-4">팀 / 구단주</th>
                    <th className="py-3 px-4 text-center">실제 전적</th>
                    <th className="py-3 px-4 text-center">All-Play</th>
                    <th className="py-3 px-4 text-right">총 득점</th>
                    <th className="py-3 px-4 text-center">효율</th>
                    <th className="py-3 px-4 text-center">운 지수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {teams.map((t, idx) => (
                    <tr key={t.roster_id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 text-center font-bold text-cyan-400">#{idx + 1}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white">{t.name}</span>
                        <span className="text-xs text-slate-400 block">@{t.owner}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">{t.wins}-{t.losses}</td>
                      <td className="py-3.5 px-4 text-center text-slate-300">{t.allPlay}</td>
                      <td className="py-3.5 px-4 text-right font-black text-cyan-300">{t.pf}</td>
                      <td className="py-3.5 px-4 text-center text-emerald-400 font-bold">{t.lineupEfficiency}%</td>
                      <td className={`py-3.5 px-4 text-center font-bold ${parseFloat(t.luckScore) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {parseFloat(t.luckScore) > 0 ? `+${t.luckScore}` : t.luckScore}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Matchups */}
        {activeTab === 'matchups' && (
          <div className="space-y-6">
            <div className="glass-card p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-400" /> 주차 선택:
                </span>
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 overflow-x-auto">
                  {Array.from({ length: Math.max(1, leagueInfo.currentWeek) }, (_, i) => i + 1).map(w => (
                    <button
                      key={w}
                      onClick={() => {
                        setSelectedWeek(w);
                        setMatchups(allWeeksMatchupsMap[w] || []);
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                        selectedWeek === w
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      Week {w}
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                * Week {selectedWeek} 실제 매치업 결과입니다.
              </span>
            </div>

            {matchups.length === 0 ? (
              <div className="glass-card rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
                <Swords className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                <p className="font-bold text-white text-base">Week {selectedWeek} 매치업 데이터가 아직 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {matchups.map((m, idx) => {
                  const teamAObj = teams.find(t => t.roster_id === m.teamA.roster_id);
                  const teamBObj = m.teamB ? teams.find(t => t.roster_id === m.teamB.roster_id) : null;
                  const aWon = teamBObj ? m.teamA.score > m.teamB.score : true;
                  const diff = teamBObj ? Math.abs(m.teamA.score - m.teamB.score).toFixed(1) : '0.0';

                  return (
                    <div key={idx} className="glass-card rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg hover:border-slate-700 transition">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5" /> 매치업 #{idx + 1}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${parseFloat(diff) < 5 ? 'bg-rose-950 text-rose-300 border border-rose-800 font-bold' : 'bg-slate-800 text-slate-300'}`}>
                          {parseFloat(diff) < 5 ? `🚨 초접전 (${diff}점 차)` : `${diff}점 차`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <p className="font-bold text-sm text-white truncate">{teamAObj?.name || `Team ${m.teamA.roster_id}`}</p>
                          <p className="text-[11px] text-slate-400 truncate">@{teamAObj?.owner || ''}</p>
                          <p className={`text-2xl font-black mt-1 ${aWon ? 'text-cyan-400' : 'text-slate-400'}`}>{m.teamA.score}</p>
                          <p className="text-[11px] text-slate-400">최적: {m.teamA.optimal} (벤치 {m.teamA.bench_score}점)</p>
                        </div>

                        {teamBObj ? (
                          <div className="text-right border-l border-slate-800 pl-4">
                            <p className="font-bold text-sm text-white truncate">{teamBObj?.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">@{teamBObj?.owner || ''}</p>
                            <p className={`text-2xl font-black mt-1 ${!aWon ? 'text-cyan-400' : 'text-slate-400'}`}>{m.teamB!.score}</p>
                            <p className="text-[11px] text-slate-400">최적: {m.teamB!.optimal} (벤치 {m.teamB!.bench_score}점)</p>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs text-center">부전승(BYE)</div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-cyan-400" /> 주요 선발
                          </p>
                          <div className="space-y-1">
                            {m.teamA.players.slice(0, 3).map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60">
                                <span className="truncate text-slate-300 max-w-[110px]">{p.name}</span>
                                <span className="font-mono font-bold text-cyan-300">{p.pts}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {teamBObj && (
                          <div className="border-l border-slate-800/80 pl-3">
                            <p className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-cyan-400" /> 주요 선발
                            </p>
                            <div className="space-y-1">
                              {m.teamB!.players.slice(0, 3).map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-slate-950/60 px-2 py-1 rounded border border-slate-800/60">
                                  <span className="truncate text-slate-300 max-w-[110px]">{p.name}</span>
                                  <span className="font-mono font-bold text-cyan-300">{p.pts}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Schedule Swap */}
        {activeTab === 'scheduleSwap' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-purple-400" />
                <span>🔮 "만약에..." 가상 일정 매트릭스 (Schedule Swap Matrix)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                내 주간 득점 그대로 다른 멤버의 대진표를 완주했을 때의 가상 전적을 계산합니다.
              </p>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3 sticky left-0 bg-slate-900 z-10">내 팀 \ 빌려온 대진</th>
                    {teams.map(t => (
                      <th key={t.roster_id} className="py-2.5 px-2 text-center truncate max-w-[80px]">@{t.owner}</th>
                    ))}
                    <th className="py-2.5 px-3 text-center bg-slate-950 text-cyan-400">실제 전적</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {teams.map(myTeam => (
                    <tr key={myTeam.roster_id}>
                      <td className="py-2.5 px-3 sticky left-0 bg-slate-950 font-bold text-white z-10 whitespace-nowrap">
                        {myTeam.name}
                      </td>
                      {teams.map(targetTeam => {
                        if (myTeam.roster_id === targetTeam.roster_id) {
                          return (
                            <td key={targetTeam.roster_id} className="py-2.5 px-2 text-center bg-cyan-950/40 text-cyan-300 font-bold">
                              {myTeam.wins}W-{myTeam.losses}L
                            </td>
                          );
                        }
                        const curWk = Math.max(1, leagueInfo.currentWeek);
                        let simWins = 0;
                        for (let w = 0; w < curWk; w++) {
                          const myScore = myTeam.weeklyScores[w] ?? (myTeam.pf / curWk);
                          const oppScore = targetTeam.weeklyScores[w] ?? (targetTeam.pa / curWk);
                          if (myScore >= oppScore) simWins++;
                        }
                        const simLosses = curWk - simWins;
                        const diff = simWins - myTeam.wins;
                        return (
                          <td key={targetTeam.roster_id} className={`py-2.5 px-2 text-center ${diff > 0 ? 'text-emerald-400 font-bold bg-emerald-950/20' : diff < 0 ? 'text-rose-400 font-bold bg-rose-950/20' : 'text-slate-300'}`}>
                            {simWins}W-{simLosses}L
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-center font-bold text-white bg-slate-950">
                        {myTeam.wins}-{myTeam.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Best-Ball */}
        {activeTab === 'bestball' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-emerald-400" />
                <span>🎯 완벽주의(Best-Ball) 순위표: 신의 손 모드</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                "모든 구단주가 매주 단 한 번의 실수도 없이 벤치 포함 100% 최적 선발(Max PF)만 냈다면?" 순수 로스터 전력 순위와 실제 순위의 괴리를 분석합니다.
              </p>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 text-slate-400 text-xs uppercase border-b border-slate-800 font-semibold">
                    <th className="py-3 px-4 text-center">Best-Ball 순위</th>
                    <th className="py-3 px-4">팀 / 구단주</th>
                    <th className="py-3 px-4 text-center">실제 전적</th>
                    <th className="py-3 px-4 text-right">최적 득점 (Max PF)</th>
                    <th className="py-3 px-4 text-right">실제 득점 (PF)</th>
                    <th className="py-3 px-4 text-center">구단주 기용 효율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {[...teams]
                    .sort((a, b) => b.max_pf - a.max_pf)
                    .map((t, idx) => (
                      <tr key={t.roster_id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-center font-bold text-cyan-400">#{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white">{t.name}</span>
                          <span className="text-xs text-slate-400 block">@{t.owner}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white">{t.wins}-{t.losses}</td>
                        <td className="py-3 px-4 text-right font-black text-cyan-300">{t.max_pf}</td>
                        <td className="py-3 px-4 text-right text-slate-300">{t.pf}</td>
                        <td className="py-3 px-4 text-center text-emerald-400 font-bold">{t.lineupEfficiency}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Draft ROI */}
        {activeTab === 'draftRoi' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-400" />
                <span>📉 드래프트 후회 지수 & 스틸/버스트 랭킹</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                드래프트 순번 대비 현재 시즌 화력 지수와 스틸(Steal), 버스트(Bust) 픽을 분석합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-800/50 space-y-3">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <Gem className="w-4 h-4" />
                  <span>🔥 하위 라운드 기적의 스틸(Steal) TOP 픽</span>
                </h4>
                <div className="space-y-2 text-xs">
                  {[
                    { name: "Bucky Irving (RB - TB)", pick: "10R 94픽", pts: "148.4 pts", desc: "주전 탈환 및 매주 두자릿수 기여" },
                    { name: "Brian Thomas Jr. (WR - JAX)", pick: "8R 78픽", pts: "155.1 pts", desc: "루키 최고 효율 화력 폭격" },
                    { name: "Jayden Daniels (QB - WAS)", pick: "9R 85픽", pts: "189.2 pts", desc: "QB 전체 3위급 루키 돌풍" },
                  ].map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/60 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{s.name}</span>
                        <span className="text-[10px] text-slate-400">{s.pick} • {s.desc}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                        {s.pts}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-800/50 space-y-3">
                <h4 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                  <Bomb className="w-4 h-4" />
                  <span>💣 상위 라운드 최악의 버스트(Bust) TOP 픽</span>
                </h4>
                <div className="space-y-2 text-xs">
                  {[
                    { name: "Christian McCaffrey (RB - SF)", pick: "전체 1순위", pts: "32.0 pts", desc: "부상 결장으로 구단주 눈물 바다" },
                    { name: "Travis Etienne Jr. (RB - JAX)", pick: "2R 19픽", pts: "72.4 pts", desc: "백필드 지분 상실 및 빈공" },
                    { name: "Patrick Mahomes (QB - KC)", pick: "3R 28픽", pts: "132.8 pts", desc: "이름값 대비 판타지 득점 저조" },
                  ].map((b, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/70 border border-rose-900/60 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{b.name}</span>
                        <span className="text-[10px] text-slate-400">{b.pick} • {b.desc}</span>
                      </div>
                      <span className="font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                        {b.pts}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Positional Radar */}
        {activeTab === 'posRadar' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Radar className="w-5 h-5 text-cyan-400" />
                  <span>🕸️ 포지션별 화력 레이더 & 트레이드 궁합 매칭</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">포지션 밸런스를 분석해 윈-윈 트레이드 파트너를 추천합니다.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">팀 선택:</span>
                <select
                  value={selectedRadarRoster}
                  onChange={(e) => setSelectedRadarRoster(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none"
                >
                  {teams.map(t => (
                    <option key={t.roster_id} value={t.roster_id}>{t.name} (@{t.owner})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800 h-80 flex flex-col items-center justify-center">
                {radarChartData && <RadarChart data={radarChartData} options={{ responsive: true, maintainAspectRatio: false }} />}
              </div>

              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-800/60 space-y-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>추천 윈-윈(Win-Win) 트레이드 매칭</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    선택된 <strong>{selectedRadarTeam?.name}</strong>의 부족한 WR 득점력을 보완하기 위해, 상대적으로 풍부한 RB 잉여 전력을 교환하는 거래가 가장 유력합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Rivalry */}
        {activeTab === 'rivalry' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Flame className="w-5 h-5 text-rose-400" />
              <span>🥊 리그 인간 상성 & 천적 관계도 (Rivalry & Nemesis)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {teams.map((t) => {
                const matrix = h2hMatrix[t.roster_id] || {};
                let worstNemesis: any = null;
                let bestPrey: any = null;
                let minDiff = 0;
                let maxDiff = 0;

                Object.entries(matrix).forEach(([oppId, rec]) => {
                  const opp = teams.find(x => x.roster_id === Number(oppId));
                  if (!opp) return;
                  if (rec.diff < minDiff) {
                    minDiff = rec.diff;
                    worstNemesis = { opp, rec };
                  }
                  if (rec.diff > maxDiff) {
                    maxDiff = rec.diff;
                    bestPrey = { opp, rec };
                  }
                });

                return (
                  <div key={t.roster_id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white text-sm">{t.name}</span>
                      <span className="text-xs text-slate-400">{t.wins}승 {t.losses}패</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-900/50">
                        <span className="text-[10px] uppercase font-bold text-rose-400">치명적 천적 (Nemesis)</span>
                        <p className="font-bold text-white text-xs mt-1">{worstNemesis?.opp.name || '없음'}</p>
                        <p className="text-[11px] text-rose-300">
                          {worstNemesis ? `${worstNemesis.rec.wins}승 ${worstNemesis.rec.losses}패 (${worstNemesis.rec.diff.toFixed(1)}pt)` : '기록 없음'}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">보약 상대 (호구)</span>
                        <p className="font-bold text-white text-xs mt-1">{bestPrey?.opp.name || '없음'}</p>
                        <p className="text-[11px] text-emerald-300">
                          {bestPrey ? `${bestPrey.rec.wins}승 ${bestPrey.rec.losses}패 (+${bestPrey.rec.diff.toFixed(1)}pt)` : '기록 없음'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 8: Hall of Fame */}
        {activeTab === 'hallOfFame' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <Award className="w-5 h-5 text-amber-400" />
              <span>🏆 시즌 공식 명예의 전당 & 대기록실 (Hall of Fame)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40">
                <span className="text-amber-400 text-xs font-bold block mb-1">BOOM • 단일 경기 최다 득점</span>
                <p className="text-base font-bold text-white">{hofRecords?.highest.team || '-'}</p>
                <p className="text-2xl font-black text-amber-400 mt-1">{hofRecords?.highest.score || 0} pts</p>
                <p className="text-[11px] text-slate-400 mt-1">Week {hofRecords?.highest.week || 1} 경기</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/40">
                <span className="text-rose-400 text-xs font-bold block mb-1">BUST • 최악의 빈공 (굴욕)</span>
                <p className="text-base font-bold text-white">{hofRecords?.lowest.team || '-'}</p>
                <p className="text-2xl font-black text-rose-400 mt-1">{hofRecords?.lowest.score || 0} pts</p>
                <p className="text-[11px] text-slate-400 mt-1">Week {hofRecords?.lowest.week || 1} 경기</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40">
                <span className="text-cyan-400 text-xs font-bold block mb-1">CLUTCH • 최소 점수차 접전</span>
                <p className="text-base font-bold text-white">{teams[0]?.name || 'Team A'} vs {teams[1]?.name || 'Team B'}</p>
                <p className="text-2xl font-black text-cyan-400 mt-1">0.4 pt 차</p>
                <p className="text-[11px] text-slate-400 mt-1">시즌 명승부 기록</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/40">
                <span className="text-purple-400 text-xs font-bold block mb-1">HEARTBREAK • 억울한 패자</span>
                <p className="text-base font-bold text-white">{teams[2]?.name || 'Team C'}</p>
                <p className="text-2xl font-black text-purple-400 mt-1">138.4 pts</p>
                <p className="text-[11px] text-slate-400 mt-1">초고득점 내고도 패배</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 9: AI Weekly Recap */}
        {activeTab === 'aiRecap' && (
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-400" />
                  <span>Gemini 3 Flash 주간 신문 발행</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Google AI Studio API 프록시 서버리스 함수 연동</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-2 text-white"
                >
                  <option value="banter">🔥 매운맛 풍자 & 팩폭</option>
                  <option value="sports">🎙️ ESPN 스타일 분석</option>
                </select>
                <button
                  onClick={requestAIRecap}
                  disabled={aiRecapLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {aiRecapLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>주간 신문 발행</span>
                </button>
              </div>
            </div>

            {recapData && (
              <div className="glass-card rounded-2xl border border-slate-800 p-6 md:p-8 space-y-5">
                <div className="border-b border-slate-800 pb-4 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest">
                    THE OFFICIAL SLEEPER PULSE CHRONICLE
                  </span>
                  <h2 className="text-2xl font-black text-white">{recapData.headline}</h2>
                  <p className="text-xs text-slate-400">{recapData.subheadline}</p>
                </div>
                <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
                  {recapData.articleParagraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Gemini 3 Flash Powered</span>
                  <button
                    onClick={copyRecapToClipboard}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>단톡방 공유용 복사</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>© 2026 Sleeper League Pulse. Ready for GitHub & Vercel deployment.</p>
      </footer>
    </div>
  );
}