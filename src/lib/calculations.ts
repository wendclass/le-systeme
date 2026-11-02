import { Transaction, RecurringExpense, ProfitFirstSettings } from '../types';
import { getMonthYearKey, getDaysUntil } from './utils';
import { convertAmount, getAppCurrency } from './currency';

export interface MilestoneProgress {
  totalRevenueUSD: number;
  targetRevenueUSD: number;
  remainingUSD: number;
  percentage: number;
  daysRemaining: number;
  monthsRemaining: number;
  startDate: string | null;
  bestMonthUSD: number;
  averageMonthlyUSD: number;
  monthlyRequiredUSD: number;
}

export interface MonthlyDataPoint {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "Sep 24"
  revenue: number;
  expense: number;
  profit: number;
}

export interface ForecastResult {
  method: 'insufficient_data' | 'moving_average' | 'linear_regression';
  methodLabel: string;
  monthsCount: number;
  projectedTotalUSD: number;
  isOptimistic: boolean;
  floorMonthlyTarget: number;
  projectedMonthlyAverage: number;
  chartData: Array<{
    monthKey: string;
    label: string;
    actualCumulative?: number;
    requiredCumulative: number;
    projectedCumulative?: number;
    projectedLow?: number;
    projectedHigh?: number;
  }>;
}

export function calculateMilestones(
  transactions: Transaction[],
  targetAmount: number,
  targetDateStr: string,
  targetCurrency?: string
): MilestoneProgress {
  const currency = targetCurrency || getAppCurrency();
  const targetDate = new Date(targetDateStr + 'T00:00:00Z');
  const revenueTx = transactions.filter((t) => t.type === 'revenu');

  // Conversion dynamique vers la devise d'affichage choisie par l'utilisateur
  const totalRevenue = revenueTx.reduce((sum, t) => {
    const fromCurr = t.devise_origine || 'USD';
    const originalAmt = t.montant_original ?? t.montant_usd ?? 0;
    const converted = convertAmount(originalAmt, fromCurr, currency);
    return sum + converted;
  }, 0);

  const remaining = Math.max(0, targetAmount - totalRevenue);
  const percentage = targetAmount > 0 ? Math.min(100, (totalRevenue / targetAmount) * 100) : 0;
  const daysRemaining = getDaysUntil(targetDate);
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30.44));

  // Determine start date (first recorded transaction)
  let startDate: string | null = null;
  if (transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    startDate = sorted[0].date;
  }

  // Monthly breakdown for revenues dans la devise choisie
  const monthlyRevenueMap: Record<string, number> = {};
  revenueTx.forEach((t) => {
    const key = getMonthYearKey(t.date);
    const fromCurr = t.devise_origine || 'USD';
    const originalAmt = t.montant_original ?? t.montant_usd ?? 0;
    const converted = convertAmount(originalAmt, fromCurr, currency);
    monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + converted;
  });

  const monthlyValues = Object.values(monthlyRevenueMap);
  const bestMonth = monthlyValues.length > 0 ? Math.max(...monthlyValues) : 0;
  const averageMonthly =
    monthlyValues.length > 0
      ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length
      : 0;

  const monthlyRequired = remaining / monthsRemaining;

  return {
    totalRevenueUSD: totalRevenue,
    targetRevenueUSD: targetAmount,
    remainingUSD: remaining,
    percentage,
    daysRemaining,
    monthsRemaining,
    startDate,
    bestMonthUSD: bestMonth,
    averageMonthlyUSD: averageMonthly,
    monthlyRequiredUSD: monthlyRequired,
  };
}

export function calculateProfitFirst(
  totalRevenueUSD: number,
  settings: ProfitFirstSettings,
  activeRecurringExpensesUSD: number
) {
  const profitUSD = (totalRevenueUSD * settings.profit) / 100;
  const ownerPayUSD = (totalRevenueUSD * settings.owner_pay) / 100;
  const taxUSD = (totalRevenueUSD * settings.tax) / 100;
  const opexUSD = (totalRevenueUSD * settings.opex) / 100;

  const opexWarning = activeRecurringExpensesUSD > opexUSD && totalRevenueUSD > 0;
  const recurringOpexRatio = opexUSD > 0 ? (activeRecurringExpensesUSD / opexUSD) * 100 : 0;

  return {
    profitUSD,
    ownerPayUSD,
    taxUSD,
    opexUSD,
    opexWarning,
    recurringOpexRatio,
  };
}

export function getNormalizedMonthlyCost(expense: RecurringExpense, targetCurrency?: string): number {
  if (expense.statut !== 'actif') return 0;
  const currency = targetCurrency || getAppCurrency();
  const fromCurr = expense.devise_origine || 'USD';
  const originalAmt = expense.montant_original ?? expense.montant_usd ?? 0;
  const converted = convertAmount(originalAmt, fromCurr, currency);
  switch (expense.frequence) {
    case 'mensuelle':
      return converted;
    case 'trimestrielle':
      return converted / 3;
    case 'annuelle':
      return converted / 12;
    default:
      return converted;
  }
}

export function calculateForecast(
  transactions: Transaction[],
  targetAmount: number,
  targetDateStr: string,
  simulatedGrowthPercent: number = 0,
  targetCurrency?: string
): ForecastResult {
  const currency = targetCurrency || getAppCurrency();
  const milestone = calculateMilestones(transactions, targetAmount, targetDateStr, currency);
  const revenueTx = transactions.filter((t) => t.type === 'revenu');

  // Group by month
  const monthlyRevenueMap: Record<string, number> = {};
  revenueTx.forEach((t) => {
    const key = getMonthYearKey(t.date);
    const fromCurr = t.devise_origine || 'USD';
    const originalAmt = t.montant_original ?? t.montant_usd ?? 0;
    const amt = convertAmount(originalAmt, fromCurr, currency);
    monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + amt;
  });

  const sortedMonthKeys = Object.keys(monthlyRevenueMap).sort();
  const monthsCount = sortedMonthKeys.length;
  const floorMonthlyTarget = milestone.monthlyRequiredUSD;

  let method: ForecastResult['method'] = 'insufficient_data';
  let methodLabel = "Moins de 2 mois de données — Objectif plancher";
  let projectedMonthlyAverage = 0;
  let isOptimistic = false;

  const chartData: ForecastResult['chartData'] = [];
  const baseMonthlyAvg = milestone.averageMonthlyUSD * (1 + simulatedGrowthPercent / 100);

  if (monthsCount >= 6) {
    method = 'linear_regression';
    methodLabel = `Régression linéaire basée sur tes ${monthsCount} derniers mois réels`;
    const n = monthsCount;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    const values = sortedMonthKeys.map((k) => monthlyRevenueMap[k]);
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += values[i]; sumXY += i * values[i]; sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / Math.max(1, n * sumXX - sumX * sumX);
    const mean = sumY / n;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const _stdDev = Math.sqrt(variance); // kept for future use

    projectedMonthlyAverage = Math.max(0, mean + slope * (n / 2)) * (1 + simulatedGrowthPercent / 100);
    isOptimistic = projectedMonthlyAverage > milestone.bestMonthUSD * 1.5 && milestone.bestMonthUSD > 0;
  } else if (monthsCount >= 2) {
    method = 'moving_average';
    methodLabel = `Moyenne mobile basée sur tes ${monthsCount} derniers mois réels`;
    projectedMonthlyAverage = baseMonthlyAvg;
    isOptimistic = projectedMonthlyAverage > milestone.bestMonthUSD * 1.5 && milestone.bestMonthUSD > 0;
  } else {
    method = 'insufficient_data';
    methodLabel = "Ajoute au moins 2 mois de données pour débloquer les projections";
    projectedMonthlyAverage = floorMonthlyTarget;
  }

  const projectedTotalUSD = milestone.totalRevenueUSD + projectedMonthlyAverage * milestone.monthsRemaining;

  // Build chart trajectory
  const now = new Date();
  let runningActual = 0;
  let runningProjected = milestone.totalRevenueUSD;
  let runningRequired = 0;
  const requiredStep = targetAmount / Math.max(1, milestone.monthsRemaining + monthsCount);

  // Past months
  sortedMonthKeys.forEach((k) => {
    runningActual += monthlyRevenueMap[k];
    runningRequired += requiredStep;
    chartData.push({
      monthKey: k,
      label: k,
      actualCumulative: runningActual,
      requiredCumulative: Math.min(targetAmount, runningRequired),
      projectedCumulative: runningActual,
    });
  });

  // Future months projection up to target date
  for (let m = 1; m <= milestone.monthsRemaining; m++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const key = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
    runningProjected += projectedMonthlyAverage;
    runningRequired += requiredStep;

    const stdSpread = method === 'linear_regression' ? Math.sqrt(m) * 450 : projectedMonthlyAverage * 0.15;

    chartData.push({
      monthKey: key,
      label: key,
      requiredCumulative: Math.min(targetAmount, runningRequired),
      projectedCumulative: method !== 'insufficient_data' ? Number(runningProjected.toFixed(0)) : undefined,
      projectedLow: method !== 'insufficient_data' ? Math.max(0, Number((runningProjected - stdSpread).toFixed(0))) : undefined,
      projectedHigh: method !== 'insufficient_data' ? Number((runningProjected + stdSpread).toFixed(0)) : undefined,
    });
  }

  return {
    method,
    methodLabel,
    monthsCount,
    projectedTotalUSD,
    isOptimistic,
    floorMonthlyTarget,
    projectedMonthlyAverage,
    chartData,
  };
}
