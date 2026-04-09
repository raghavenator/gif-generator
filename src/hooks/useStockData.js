import { useState, useCallback } from 'react';

function parseAlphaVantage(json) {
  const series = json['Time Series (Daily)'];
  if (!series) return null;
  return Object.entries(series)
    .map(([date, v]) => ({
      date: new Date(date),
      open:   parseFloat(v['1. open']),
      high:   parseFloat(v['2. high']),
      low:    parseFloat(v['3. low']),
      close:  parseFloat(v['4. close']),
      volume: parseInt(v['5. volume'], 10),
    }))
    .sort((a, b) => a.date - b.date)
    .slice(-90);
}

export const FUNDAMENTAL_METRICS = [
  { key: 'totalRevenue',     label: 'Revenue' },
  { key: 'grossProfit',      label: 'Gross Profit' },
  { key: 'ebitda',           label: 'EBITDA' },
  { key: 'netIncome',        label: 'Net Income' },
  { key: 'operatingIncome',  label: 'Operating Income' },
];

function quarterLabel(dateStr) {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function parseFundamentals(json, metricKey) {
  const reports = json.quarterlyReports;
  if (!reports?.length) return null;
  return reports
    .slice(0, 8)
    .reverse()
    .map(r => ({
      quarter: quarterLabel(r.fiscalDateEnding),
      value:   parseFloat(r[metricKey]) || 0,
    }));
}

export function useStockData() {
  const [data,         setData]         = useState([]);
  const [fundamentals, setFundamentals] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  function checkRateLimit(json) {
    if (json.Note || json.Information)
      throw new Error('API rate limit reached — try again in a minute, or get a free key at alphavantage.co');
  }

  const fetchData = useCallback(async (symbol, apiKey = 'demo') => {
    setLoading(true);
    setError(null);
    try {
      const url =
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY` +
        `&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`;
      const res  = await fetch(url);
      const json = await res.json();
      checkRateLimit(json);
      const parsed = parseAlphaVantage(json);
      if (!parsed || !parsed.length) throw new Error(`No data for "${symbol}". Try IBM, AAPL, or MSFT with the demo key.`);
      setData(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFundamentals = useCallback(async (symbol, apiKey, metricKey) => {
    if (!apiKey || apiKey === 'demo') {
      setError('Financials require a real Alpha Vantage API key — demo key not supported.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url =
        `https://www.alphavantage.co/query?function=INCOME_STATEMENT` +
        `&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
      const res  = await fetch(url);
      const json = await res.json();
      checkRateLimit(json);
      const parsed = parseFundamentals(json, metricKey);
      if (!parsed || !parsed.length) throw new Error(`No financial data for "${symbol}".`);
      setFundamentals(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, fundamentals, loading, error, fetchData, fetchFundamentals };
}
