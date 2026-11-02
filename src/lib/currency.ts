export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  defaultRateToUsd: number; // 1 unit in USD
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'XOF', name: 'Franc CFA (BCEAO)', symbol: 'FCFA', flag: '🇧🇫', defaultRateToUsd: 1 / 606 },
  { code: 'USD', name: 'Dollar Américain', symbol: '$', flag: '🇺🇸', defaultRateToUsd: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', defaultRateToUsd: 1.08 },
  { code: 'GBP', name: 'Livre Sterling', symbol: '£', flag: '🇬🇧', defaultRateToUsd: 1.28 },
  { code: 'CAD', name: 'Dollar Canadien', symbol: 'CA$', flag: '🇨🇦', defaultRateToUsd: 0.74 },
];

/**
 * Récupère la devise active de l'application (par défaut XOF pour Class S).
 */
export function getAppCurrency(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('class_s_primary_currency');
    if (saved) return saved;
  }
  return 'XOF';
}

/**
 * Modifie la devise active de l'application et la mémorise localement.
 */
export function setAppCurrency(code: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('class_s_primary_currency', code);
  }
}

/**
 * Converts any amount to USD based on the specified currency and optional live rates dictionary.
 */
export function convertToUSD(
  amount: number,
  currencyCode: string,
  customRates?: Record<string, number>
): number {
  if (isNaN(amount) || amount <= 0) return 0;
  if (currencyCode === 'USD') return Number(amount.toFixed(2));

  if (customRates && customRates[currencyCode]) {
    return Number((amount * customRates[currencyCode]).toFixed(2));
  }

  const found = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  if (found) {
    return Number((amount * found.defaultRateToUsd).toFixed(2));
  }

  // Fallback for XOF
  if (currencyCode === 'XOF' || currencyCode === 'FCFA') {
    return Number((amount * (1 / 606)).toFixed(2));
  }

  return Number(amount.toFixed(2));
}

/**
 * Convertit un montant d'une devise quelconque vers une devise cible.
 */
export function convertAmount(
  amount: number,
  fromCurrency: string = 'XOF',
  toCurrency: string = 'XOF',
  customRates?: Record<string, number>
): number {
  if (!amount || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;

  // 1. Passage en USD pivot
  const inUSD = convertToUSD(amount, fromCurrency, customRates);
  if (toCurrency === 'USD') return inUSD;

  // 2. Conversion depuis USD vers la devise cible
  if (toCurrency === 'XOF' || toCurrency === 'FCFA') {
    return Math.round(inUSD * 606);
  }
  if (toCurrency === 'EUR') {
    return Number((inUSD / 1.08).toFixed(2));
  }
  if (toCurrency === 'GBP') {
    return Number((inUSD / 1.28).toFixed(2));
  }
  if (toCurrency === 'CAD') {
    return Number((inUSD / 0.74).toFixed(2));
  }

  return inUSD;
}

/**
 * Formatage universel respectant la devise choisie par l'utilisateur.
 */
export function formatCurrency(
  amount: number,
  currencyCode?: string,
  decimals: number = 0
): string {
  const code = currencyCode || getAppCurrency();

  if (isNaN(amount) || amount === null || amount === undefined) {
    if (code === 'XOF' || code === 'FCFA') return '0 FCFA';
    if (code === 'EUR') return '0 €';
    if (code === 'USD') return '$0';
    return `0 ${code}`;
  }

  if (code === 'XOF' || code === 'FCFA') {
    return (
      new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        maximumFractionDigits: 0,
      }).format(Math.round(amount)) + ' FCFA'
    );
  }

  if (code === 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  if (code === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  if (code === 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  if (code === 'CAD') {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: decimals,
  }).format(amount)} ${code}`;
}

/**
 * Formate un montant d'une transaction ou dépense récurrente dans la devise active.
 */
export function formatTransactionAmount(
  originalAmount: number | undefined,
  originalCurrency: string | undefined,
  usdFallback?: number,
  decimals: number = 0
): string {
  const activeCurr = getAppCurrency();
  const amt =
    originalAmount !== undefined && originalAmount !== null
      ? originalAmount
      : (usdFallback ?? 0);
  const fromCurr = originalCurrency || (originalAmount !== undefined ? 'XOF' : 'USD');
  const converted = convertAmount(amt, fromCurr, activeCurr);
  return formatCurrency(converted, activeCurr, decimals);
}

/**
 * Fetch live rates from a configured API endpoint if provided
 */
export async function fetchLiveRatesFromApi(apiUrl: string): Promise<Record<string, number> | null> {
  if (!apiUrl) return null;
  try {
    const res = await fetch(apiUrl);
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates || data;
  } catch (err) {
    console.warn("Could not fetch live currency rates from API:", err);
    return null;
  }
}
