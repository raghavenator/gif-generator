import { useState, useCallback } from 'react';

export const PRICE_PERIODS = [
  { label: '1M',      days: 30  },
  { label: '3M',      days: 90  },
  { label: '6M',      days: 180 },
  { label: '1Y',      days: 365 },
  { label: '2Y',      days: 730 },
  { label: 'Feb 28+', fromDate: '2026-02-28' },
];

export const FINANCIALS_PERIODS = [
  { label: '4Q',  quarters: 4  },
  { label: '8Q',  quarters: 8  },
  { label: '12Q', quarters: 12 },
];

export const FUNDAMENTAL_METRICS = [
  { key: 'totalRevenue',     label: 'Revenue' },
  { key: 'grossProfit',      label: 'Gross Profit' },
  { key: 'ebitda',           label: 'EBITDA' },
  { key: 'netIncome',        label: 'Net Income' },
  { key: 'operatingIncome',  label: 'Operating Income' },
];

// ── Cache helpers ──────────────────────────────────────────────────────────────

function cacheKey(type, ...parts) {
  return `stock_cache_${type}_${parts.join('_')}`;
}

function cacheWrite(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch { /* storage full — skip */ }
}

function cacheRead(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function cacheDate(str) { return new Date(str); }

// ── Parsers ────────────────────────────────────────────────────────────────────

function parseAlphaVantage(json, period = { days: 90 }) {
  const series = json['Time Series (Daily)'];
  if (!series) return null;
  const all = Object.entries(series)
    .map(([date, v]) => ({
      date:   new Date(date),
      open:   parseFloat(v['1. open']),
      high:   parseFloat(v['2. high']),
      low:    parseFloat(v['3. low']),
      close:  parseFloat(v['4. close']),
      volume: parseInt(v['5. volume'], 10),
    }))
    .sort((a, b) => a.date - b.date);

  if (period.fromDate) {
    const from = new Date(period.fromDate);
    return all.filter(d => d.date >= from);
  }
  return all.slice(-(period.days ?? 90));
}

function quarterLabel(dateStr) {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function parseFundamentals(json, metricKey, quarters = 8) {
  const reports = json.quarterlyReports;
  if (!reports?.length) return null;
  return reports
    .slice(0, quarters)
    .reverse()
    .map(r => ({
      quarter: quarterLabel(r.fiscalDateEnding),
      value:   parseFloat(r[metricKey]) || 0,
    }));
}

function checkRateLimit(json) {
  if (json.Note || json.Information)
    throw new Error('API rate limit reached — try again in a minute, or get a free key at alphavantage.co');
}

// ── Demo data generators ───────────────────────────────────────────────────────

function makeDemoPriceData(days = 90) {
  const data = [];
  let price = 150;
  const now = new Date();
  // Seeded pseudo-random for deterministic output
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends
    const change = (rand() - 0.48) * 4;
    price = Math.max(80, price + change);
    const open  = price + (rand() - 0.5) * 2;
    const high  = Math.max(price, open) + rand() * 2;
    const low   = Math.min(price, open) - rand() * 2;
    data.push({ date, open, high, low, close: price, volume: Math.floor(rand() * 8e7 + 2e7) });
  }
  return data;
}

function makeDemoFundamentals(metricKey, quarters = 8) {
  const bases = {
    totalRevenue:    90e9,
    grossProfit:     38e9,
    ebitda:          28e9,
    netIncome:       22e9,
    operatingIncome: 26e9,
  };
  const base = bases[metricKey] ?? 10e9;
  let seed = 7;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

  const now = new Date();
  return Array.from({ length: quarters }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (quarters - 1 - i) * 3);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return {
      quarter: `Q${q} ${d.getFullYear()}`,
      value: base * (0.85 + rand() * 0.3),
    };
  });
}

function fmtCacheDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useStockData() {
  const [data,         setData]         = useState([]);
  const [fundamentals, setFundamentals] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [warning,      setWarning]      = useState(null);

  const fetchData = useCallback(async (symbol, apiKey = 'demo', period = { days: 90 }) => {
    setLoading(true);
    setError(null);
    setWarning(null);

    if (symbol === 'DEMO') {
      const days = period.fromDate
        ? Math.ceil((Date.now() - new Date(period.fromDate)) / 86400000)
        : (period.days ?? 90);
      setData(makeDemoPriceData(days));
      setLoading(false);
      return;
    }

    const key = cacheKey('price', symbol, period.label ?? period.days ?? 'default');

    try {
      const days = period.fromDate
        ? Math.ceil((Date.now() - new Date(period.fromDate)) / 86400000)
        : (period.days ?? 90);
      const outputsize = days > 100 ? 'full' : 'compact';
      const url =
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY` +
        `&symbol=${encodeURIComponent(symbol)}&outputsize=${outputsize}&apikey=${apiKey}`;
      const res  = await fetch(url);
      const json = await res.json();
      checkRateLimit(json);
      const parsed = parseAlphaVantage(json, period);
      if (!parsed || !parsed.length) throw new Error(`No data for "${symbol}". Try IBM, AAPL, or MSFT with the demo key.`);

      // Success — update cache and display
      cacheWrite(key, parsed.map(d => ({ ...d, date: d.date.toISOString() })));
      setData(parsed);
    } catch (err) {
      const cached = cacheRead(key);
      if (cached) {
        const restored = cached.data.map(d => ({ ...d, date: cacheDate(d.date) }));
        setData(restored);
        setWarning(`Couldn't get latest data — showing cached data from ${fmtCacheDate(cached.cachedAt)}. (${err.message})`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFundamentals = useCallback(async (symbol, apiKey, metricKey, quarters = 8) => {
    if (symbol === 'DEMO') {
      setFundamentals(makeDemoFundamentals(metricKey, quarters));
      return;
    }
    if (!apiKey || apiKey === 'demo') {
      setError('Financials require a real Alpha Vantage API key — demo key not supported.');
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);

    const key = cacheKey('fin', symbol, metricKey, quarters);

    try {
      const url =
        `https://www.alphavantage.co/query?function=INCOME_STATEMENT` +
        `&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res  = await fetch(url);
      const json = await res.json();
      checkRateLimit(json);
      const parsed = parseFundamentals(json, metricKey, quarters);
      if (!parsed || !parsed.length) throw new Error(`No financial data for "${symbol}".`);

      // Success — update cache and display
      cacheWrite(key, parsed);
      setFundamentals(parsed);
    } catch (err) {
      const cached = cacheRead(key);
      if (cached) {
        setFundamentals(cached.data);
        setWarning(`Couldn't get latest data — showing cached data from ${fmtCacheDate(cached.cachedAt)}. (${err.message})`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, fundamentals, loading, error, warning, fetchData, fetchFundamentals };
}
