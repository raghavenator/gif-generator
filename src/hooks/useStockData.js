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

export function useStockData() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async (symbol, apiKey = 'demo') => {
    setLoading(true);
    setError(null);
    try {
      const url =
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY` +
        `&symbol=${encodeURIComponent(symbol)}&outputsize=compact&apikey=${apiKey}`;
      const res  = await fetch(url);
      const json = await res.json();

      if (json.Note || json.Information) {
        throw new Error('API rate limit reached — try again in a minute, or get a free key at alphavantage.co');
      }

      const parsed = parseAlphaVantage(json);
      if (!parsed || !parsed.length) throw new Error(`No data for "${symbol}". Try IBM, AAPL, or MSFT with the demo key.`);
      setData(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
}
