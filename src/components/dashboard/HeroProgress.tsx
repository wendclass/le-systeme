import React from 'react';
import { GlassCard } from '../common/GlassCard';
import { StatCounter } from '../common/StatCounter';
import { MilestoneProgress } from '../../lib/calculations';
import { formatUSD } from '../../lib/utils';
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Calendar, Sparkles } from 'lucide-react';

interface HeroProgressProps {
  milestone: MilestoneProgress;
  targetDateStr: string;
  onOpenNewTransaction: () => void;
}

export const HeroProgress: React.FC<HeroProgressProps> = ({
  milestone,
  targetDateStr,
  onOpenNewTransaction,
}) => {
  const chartData = [
    {
      name: 'Progression',
      value: Math.min(100, Math.max(0, milestone.percentage)),
      fill: 'url(#heroProgressGradient)',
    },
  ];

  const isEmpty = milestone.totalRevenueUSD === 0;

  const formattedTargetDate = new Date(targetDateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <GlassCard
      variant="hero"
      hasSheen={true}
      className="p-6 sm:p-8 relative overflow-hidden"
    >
      {/* Background glow orb */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#6600CC]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#C9A070]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center relative z-10">
        {/* Left column: Main Numbers & Countdown */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#6600CC]/40 border border-[#A87FE8]/40 text-xs font-bold text-[#A87FE8] tracking-widest uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A070]" />
              Objectif Ultime • Rang Class S
            </span>
            <span className="text-xs text-white/50">•</span>
            <div className="flex items-center gap-1 text-xs text-[#C9A070] font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formattedTargetDate}</span>
            </div>
          </div>

          <div className="my-2">
            {/* Montant Hero 64px clamp with tabular-nums */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-bold text-white tracking-tight leading-none font-jost tabular-nums drop-shadow-md">
                <StatCounter value={milestone.totalRevenueUSD} currency="USD" durationMs={800} />
              </h1>
              <span className="text-lg sm:text-xl text-white/50 font-normal">
                / {formatUSD(milestone.targetRevenueUSD, 0)}
              </span>
            </div>
            <p className="text-sm text-white/70 mt-2 font-medium">
              Chiffre d'affaires cumulé vers le rang S
            </p>
          </div>

          {/* Empty state or progress chips */}
          {isEmpty ? (
            <div className="mt-4 p-4 rounded-2xl bg-[#6600CC]/20 border border-[#A87FE8]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Ta première transaction lance le compte à rebours vers le rang S.
                </p>
                <p className="text-xs text-white/60">
                  Enregistre ton premier revenu pour activer la progression dynamique.
                </p>
              </div>
              <button
                onClick={onOpenNewTransaction}
                className="btn-cta px-4 py-2 rounded-xl bg-gradient-to-r from-[#6600CC] to-[#A87FE8] text-white text-xs font-semibold whitespace-nowrap shadow-md"
              >
                + Enregistrer un revenu
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <span className="text-white/60">Reste à générer :</span>
                <span className="font-bold text-[#C9A070] tabular-nums">
                  {formatUSD(milestone.remainingUSD, 0)}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <span className="text-white/60">Temps restant :</span>
                <span className="font-bold text-[#A87FE8] tabular-nums">
                  {milestone.daysRemaining} jours
                </span>
              </div>
            </div>
          )}

          {/* Bottom 3 Mini KPIs */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6 pt-5 border-t border-white/10">
            <div>
              <span className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider block font-semibold">
                Objectif Mensuel
              </span>
              <span className="text-base sm:text-lg font-bold text-white tabular-nums mt-0.5 block">
                {formatUSD(milestone.monthlyRequiredUSD, 0)}
                <span className="text-xs text-white/40 font-normal"> /mois</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider block font-semibold">
                Meilleur Mois
              </span>
              <span className="text-base sm:text-lg font-bold text-[#4ADE9A] tabular-nums mt-0.5 block">
                {milestone.bestMonthUSD > 0 ? formatUSD(milestone.bestMonthUSD, 0) : '-'}
              </span>
            </div>

            <div>
              <span className="text-[11px] sm:text-xs text-white/50 uppercase tracking-wider block font-semibold">
                Moyenne Réelle
              </span>
              <span className="text-base sm:text-lg font-bold text-[#A87FE8] tabular-nums mt-0.5 block">
                {milestone.averageMonthlyUSD > 0 ? formatUSD(milestone.averageMonthlyUSD, 0) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Circular Radial Ring */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center relative">
          <div className="w-52 h-52 sm:w-60 sm:h-60 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="78%"
                outerRadius="100%"
                barSize={14}
                data={chartData}
                startAngle={90}
                endAngle={-270}
              >
                <defs>
                  <linearGradient id="heroProgressGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#6600CC" />
                    <stop offset="50%" stopColor="#A87FE8" />
                    <stop offset="100%" stopColor="#C9A070" />
                  </linearGradient>
                </defs>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar
                  background={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  dataKey="value"
                  cornerRadius={10}
                  animationDuration={1400}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Centered label inside the radial gauge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums tracking-tight font-jost">
                {milestone.percentage.toFixed(1)}%
              </span>
              <span className="text-[11px] uppercase tracking-widest text-[#A87FE8] font-semibold mt-0.5">
                Complété
              </span>
            </div>
          </div>

          <div className="text-center mt-1">
            <span className="text-xs text-white/50">
              {milestone.monthsRemaining} mois restants jusqu'à l'échéance
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
