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

function parseFundamentalsWithDates(json, metricKey, quarters = 8) {
  const reports = json.quarterlyReports;
  if (!reports?.length) return null;
  return reports
    .slice(0, quarters)
    .reverse()
    .map(r => ({
      quarter: quarterLabel(r.fiscalDateEnding),
      value:   parseFloat(r[metricKey]) || 0,
      date:    new Date(r.fiscalDateEnding),
    }));
}


function checkRateLimit(json) {
  if (json.Note || json.Information)
    throw new Error('API rate limit reached — try again in a minute, or get a free key at alphavantage.co');
}

// ── Finnhub helpers ────────────────────────────────────────────────────────────

const FINNHUB_CONCEPTS = {
  totalRevenue:    ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
  grossProfit:     ['GrossProfit'],
  netIncome:       ['NetIncomeLoss', 'NetIncome', 'ProfitLoss'],
  operatingIncome: ['OperatingIncomeLoss'],
  ebitda:          ['EarningsBeforeInterestTaxesDepreciationAndAmortization', 'EBITDA'],
};

function findConceptValue(items, concepts) {
  if (!items?.length || !concepts?.length) return null;
  for (const concept of concepts) {
    const item = items.find(i => i.concept === concept);
    if (item?.value != null) return item.value;
  }
  return null;
}

function parseFinnhubCandles(json) {
  if (json.s !== 'ok' || !json.t?.length) return null;
  return json.t.map((t, i) => ({
    date:   new Date(t * 1000),
    open:   json.o[i],
    high:   json.h[i],
    low:    json.l[i],
    close:  json.c[i],
    volume: json.v[i],
  }));
}

// withDates=true includes a `date` field for joining with price data
function parseFinnhubFin(json, metricKey, quarters, withDates = false) {
  const reports = json.data;
  if (!reports?.length) return null;
  const concepts = FINNHUB_CONCEPTS[metricKey] ?? [];
  const rows = reports
    .filter(r => r.report?.ic?.length)
    .slice(0, quarters)
    .reverse()
    .map(r => {
      let value = findConceptValue(r.report.ic, concepts);
      // EBITDA fallback: operating income + D&A from cash flow statement
      if (value == null && metricKey === 'ebitda') {
        const oi = findConceptValue(r.report.ic, FINNHUB_CONCEPTS.operatingIncome);
        const da = findConceptValue(r.report.cf, ['DepreciationAndAmortization', 'DepreciationDepletionAndAmortization']);
        if (oi != null) value = oi + (da ?? 0);
      }
      const d = new Date(r.endDate);
      const q = Math.ceil((d.getMonth() + 1) / 3);
      const entry = { quarter: `Q${q} ${d.getFullYear()}`, value: value ?? 0 };
      if (withDates) entry.date = d;
      return entry;
    });
  return rows.length ? rows : null;
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

function makeDemoOverlay(metricKey, quarters = 8) {
  const bases = {
    totalRevenue: 90e9, grossProfit: 38e9, ebitda: 28e9,
    netIncome: 22e9, operatingIncome: 26e9,
  };
  const base = bases[metricKey] ?? 10e9;
  let seed = 7;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

  const now = new Date();
  const items = Array.from({ length: quarters }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (quarters - 1 - i) * 3);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return { quarter: `Q${q} ${d.getFullYear()}`, value: base * (0.85 + rand() * 0.3), date: d };
  });

  // Generate daily price data covering the full quarters range
  const firstDate = items[0].date;
  const totalDays = Math.ceil((now - firstDate) / 86400000) + 15;
  const priceData = makeDemoPriceData(totalDays);

  return {
    quarters: items.map(({ quarter, value, date }) => ({ quarter, value, date })),
    priceData,
  };
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
  const [overlayData,  setOverlayData]  = useState(null);
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

  const fetchOverlay = useCallback(async (symbol, apiKey, metricKey, quarters = 8) => {
    if (symbol === 'DEMO') {
      setOverlayData(makeDemoOverlay(metricKey, quarters));
      return;
    }
    if (!apiKey || apiKey === 'demo') {
      setError('P+F overlay requires a real Alpha Vantage API key.');
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const [finRes, priceRes] = await Promise.all([
        fetch(`https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`),
        fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${apiKey}`),
      ]);
      const [finJson, priceJson] = await Promise.all([finRes.json(), priceRes.json()]);

      checkRateLimit(finJson);
      checkRateLimit(priceJson);

      const finData   = parseFundamentalsWithDates(finJson, metricKey, quarters);
      const priceData = parseAlphaVantage(priceJson, { days: 730 });

      if (!finData?.length)   throw new Error(`No financial data for "${symbol}".`);
      if (!priceData?.length) throw new Error(`No price data for "${symbol}".`);

      setOverlayData({ quarters: finData, priceData });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDataFinnhub = useCallback(async (symbol, apiKey, period = { days: 90 }) => {
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

    const to   = Math.floor(Date.now() / 1000);
    const from = period.fromDate
      ? Math.floor(new Date(period.fromDate).getTime() / 1000)
      : to - (period.days ?? 90) * 86400;
    const key = cacheKey('fh_price', symbol, period.label ?? period.days ?? 'default');

    try {
      const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
      const res  = await fetch(url);
      if (res.status === 403) throw new Error('Finnhub stock candle data requires a paid plan. Use Alpha Vantage for price charts, or upgrade at finnhub.io.');
      if (!res.ok)            throw new Error(`Finnhub API error ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const parsed = parseFinnhubCandles(json);
      if (!parsed?.length) throw new Error(`No price data for "${symbol}" from Finnhub. Check the symbol and try again.`);
      cacheWrite(key, parsed.map(d => ({ ...d, date: d.date.toISOString() })));
      setData(parsed);
    } catch (err) {
      const cached = cacheRead(key);
      if (cached) {
        setData(cached.data.map(d => ({ ...d, date: cacheDate(d.date) })));
        setWarning(`Couldn't get latest data — showing cached data from ${fmtCacheDate(cached.cachedAt)}. (${err.message})`);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFundamentalsFinnhub = useCallback(async (symbol, apiKey, metricKey, quarters = 8) => {
    if (symbol === 'DEMO') {
      setFundamentals(makeDemoFundamentals(metricKey, quarters));
      return;
    }
    if (!apiKey) {
      setError('Finnhub financials require an API key — get a free key at finnhub.io');
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);

    const key = cacheKey('fh_fin', symbol, metricKey, quarters);

    try {
      const url  = `https://finnhub.io/api/v1/financials-reported?symbol=${encodeURIComponent(symbol)}&freq=quarterly&token=${apiKey}`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`Finnhub API error ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const parsed = parseFinnhubFin(json, metricKey, quarters);
      if (!parsed?.length) throw new Error(`No financial data for "${symbol}" from Finnhub.`);
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

  const fetchOverlayFinnhub = useCallback(async (symbol, apiKey, metricKey, quarters = 8) => {
    if (symbol === 'DEMO') {
      setOverlayData(makeDemoOverlay(metricKey, quarters));
      return;
    }
    if (!apiKey) {
      setError('Finnhub P+F overlay requires an API key — get a free key at finnhub.io');
      return;
    }
    setLoading(true);
    setError(null);
    setWarning(null);

    const to   = Math.floor(Date.now() / 1000);
    const from = to - 730 * 86400; // 2 years back for price coverage

    try {
      const [finRes, priceRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/financials-reported?symbol=${encodeURIComponent(symbol)}&freq=quarterly&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`),
      ]);
      if (!finRes.ok)   throw new Error(`Finnhub API error ${finRes.status}: ${finRes.statusText}`);
      if (priceRes.status === 403) throw new Error('Finnhub stock candle data requires a paid plan. Financials-only is available — use the Financials view instead, or switch to Alpha Vantage for P+F overlay.');
      if (!priceRes.ok) throw new Error(`Finnhub API error ${priceRes.status}: ${priceRes.statusText}`);
      const [finJson, priceJson] = await Promise.all([finRes.json(), priceRes.json()]);
      if (finJson.error)   throw new Error(finJson.error);
      if (priceJson.error) throw new Error(priceJson.error);

      const finData   = parseFinnhubFin(finJson, metricKey, quarters, true);
      const priceData = parseFinnhubCandles(priceJson);
      if (!finData?.length) throw new Error(`No financial data for "${symbol}" from Finnhub.`);

      setOverlayData({ quarters: finData, priceData });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData([]);
    setFundamentals(null);
    setOverlayData(null);
    setError(null);
    setWarning(null);
  }, []);

  return { data, fundamentals, overlayData, loading, error, warning, fetchData, fetchFundamentals, fetchOverlay, fetchDataFinnhub, fetchFundamentalsFinnhub, fetchOverlayFinnhub, clearData };
}
