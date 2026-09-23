import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sleeper League Pulse - 판타지 리그 종합 분석 대시보드',
  description: 'Sleeper API 기반 실시간 전력 분석, All-Play, 몬테카를로 시뮬레이션, Gemini 3 Flash 주간 신문',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen flex flex-col bg-[#0c101a] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}