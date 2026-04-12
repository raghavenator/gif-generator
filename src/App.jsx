import { useState, useRef, useEffect } from 'react';

import StockChart         from './visualizations/StockChart';
import FundamentalsChart  from './visualizations/FundamentalsChart';
import SportsChart  from './visualizations/SportsChart';
import CricketChart from './visualizations/CricketChart';
import ExportButton from './components/ExportButton';

import { useStockData, FUNDAMENTAL_METRICS, PRICE_PERIODS, FINANCIALS_PERIODS } from './hooks/useStockData';
import { useSportsData, SPORTS_OPTIONS }         from './hooks/useSportsData';
import { useCricketData, SAMPLE_MATCHES }        from './hooks/useCricketData';

const TABS = ['Stocks', 'Sports', 'Cricket'];

const STOCK_OPTIONS = [
  { symbol: 'DEMO',  name: '⚡ Demo Stock' },
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet (Google)' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'NVDA',  name: 'NVIDIA' },
  { symbol: 'META',  name: 'Meta' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'IBM',   name: 'IBM' },
  { symbol: 'NFLX',  name: 'Netflix' },
  { symbol: 'JPM',   name: 'JPMorgan Chase' },
  { symbol: 'V',     name: 'Visa' },
  { symbol: 'WMT',   name: 'Walmart' },
  { symbol: 'DIS',   name: 'Disney' },
  { symbol: 'PYPL',  name: 'PayPal' },
  { symbol: 'INTC',  name: 'Intel' },
  { symbol: 'AMD',   name: 'AMD' },
  { symbol: 'BAC',   name: 'Bank of America' },
  { symbol: 'KO',    name: 'Coca-Cola' },
  { symbol: 'PEP',   name: 'PepsiCo' },
  { symbol: 'SPOT',  name: 'Spotify' },
];

const s = {
  app: {
    minHeight: '100vh',
    background: '#0d0f14',
    color: '#e2e8f0',
    fontFamily: "system-ui, 'Segoe UI', sans-serif",
  },
  header: {
    borderBottom: '1px solid #1e2130',
    padding: '14px 24px',
  },
  logo: { fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' },
  subtitle: { fontSize: '13px', color: '#475569', marginTop: '2px' },
  tabBar: {
    borderBottom: '1px solid #1e2130',
    padding: '0 24px',
    display: 'flex',
    gap: '4px',
  },
  main: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
  card: {
    background: '#13151c',
    border: '1px solid #1e2130',
    borderRadius: '12px',
    padding: '8px',
    marginBottom: '20px',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: '20px',
  },
  input: {
    background: '#1e2130',
    border: '1px solid #2d3148',
    borderRadius: '6px',
    padding: '7px 12px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  select: {
    background: '#1e2130',
    border: '1px solid #2d3148',
    borderRadius: '6px',
    padding: '7px 10px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  error: {
    background: '#2d1515',
    border: '1px solid #7f1d1d',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '16px',
  },
  gifBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '14px 16px',
    background: '#13151c',
    border: '1px solid #1e2130',
    borderRadius: '10px',
    marginTop: '8px',
  },
  dimLabel: { fontSize: '12px', color: '#475569', marginRight: '4px' },
  hint: { fontSize: '12px', color: '#475569' },
};

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid #818cf8' : '2px solid transparent',
        color: active ? '#818cf8' : '#64748b',
        fontSize: '14px',
        fontWeight: active ? '600' : '400',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'color 0.15s',
      }}
    >
      {label}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState('Stocks');
  const [gif, setGif] = useState({ fps: 24, numFrames: 72 });
  const chartRef = useRef(null);

  // Stock
  const { data: stockData, fundamentals, loading: stockLoading, error: stockError, warning: stockWarning, fetchData: fetchStock, fetchFundamentals } = useStockData();
  const [stockSymbol,  setStockSymbol]  = useState('AAPL');
  const [stockView,    setStockView]    = useState('price'); // 'price' | 'financials'
  const [metricKey,    setMetricKey]    = useState('totalRevenue');
  const [pricePeriod,  setPricePeriod]  = useState('3M');
  const [finPeriod,    setFinPeriod]    = useState(8);
  const [chartColor,   setChartColor]   = useState(() => localStorage.getItem('stock_color') || '#818cf8');
  const [savedKeys,   setSavedKeys]   = useState(() => JSON.parse(localStorage.getItem('av_keys') || '[]'));
  const [selectedKey, setSelectedKey] = useState('demo');
  const [addingKey,   setAddingKey]   = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  useEffect(() => {
    localStorage.setItem('av_keys', JSON.stringify(savedKeys));
  }, [savedKeys]);


  function saveKey() {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) return;
    const entry = { label: newKeyLabel.trim(), key: newKeyValue.trim() };
    setSavedKeys(k => [...k, entry]);
    setSelectedKey(entry.label);
    setNewKeyLabel('');
    setNewKeyValue('');
    setAddingKey(false);
  }

  function removeKey(label) {
    setSavedKeys(k => k.filter(e => e.label !== label));
    if (selectedKey === label) setSelectedKey('demo');
  }

  const activeKeyValue = selectedKey === 'demo'
    ? 'demo'
    : (savedKeys.find(e => e.label === selectedKey)?.key || 'demo');

  // Sports
  const { teams, loading: sportsLoading, error: sportsError, label: sportsLabel, fetchData: fetchSports } = useSportsData();
  const [sport, setSport] = useState('nba');

  // Cricket
  const { match, liveMatches, loading: cricketLoading, error: cricketError, loadSample, fetchIPLMatches, fetchMatchScorecard } = useCricketData();
  const [matchId,      setMatchId]      = useState(SAMPLE_MATCHES[0].id);
  const [cricketMode,  setCricketMode]  = useState('sample'); // 'sample' | 'live'
  const [cricKey,      setCricKey]      = useState(() => localStorage.getItem('cric_key') || '');
  const [selectedLive, setSelectedLive] = useState('');

  const exportFilename = (() => {
    if (tab === 'Stocks') {
      const company = STOCK_OPTIONS.find(o => o.symbol === stockSymbol)?.name ?? stockSymbol;
      const view    = stockView === 'price' ? 'price' : FUNDAMENTAL_METRICS.find(m => m.key === metricKey)?.label ?? 'financials';
      const period  = pricePeriod;
      return `${company}-${period}-${view}`.replace(/\s+/g, '-');
    }
    return 'chart';
  })();

  const activeError =
    tab === 'Stocks'  ? stockError  :
    tab === 'Sports'  ? sportsError :
    tab === 'Cricket' ? cricketError : null;

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.logo}>🎞 GIF Generator</div>
        <div style={s.subtitle}>Animated data visualisations → one-click GIF export</div>
      </header>

      <div style={s.tabBar}>
        {TABS.map(t => (
          <TabButton key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      <main style={s.main}>
        {activeError && <div style={s.error}>{activeError}</div>}
        {!activeError && tab === 'Stocks' && stockWarning && (
          <div style={{ ...s.error, background: '#2d2008', borderColor: '#92400e', color: '#fcd34d' }}>
            ⚠ {stockWarning}
          </div>
        )}

        {/* Chart */}
        <div style={s.card}>
          {tab === 'Stocks' && stockView === 'price'     && <StockChart        ref={chartRef} data={stockData}   symbol={stockSymbol} color={chartColor} />}
          {tab === 'Stocks' && stockView === 'financials' && <FundamentalsChart ref={chartRef} data={fundamentals} symbol={stockSymbol} color={chartColor} metricLabel={FUNDAMENTAL_METRICS.find(m => m.key === metricKey)?.label} />}
          {tab === 'Sports'  && <SportsChart  ref={chartRef} teams={teams}    label={sportsLabel}  />}
          {tab === 'Cricket' && <CricketChart ref={chartRef} match={match} />}
        </div>

        {/* Controls */}
        {tab === 'Stocks' && (
          <div style={{ ...s.controls, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* View toggle */}
              <button
                style={{ ...s.btn, ...(stockView === 'price' ? {} : { background: '#1e2130', border: '1px solid #2d3148', color: '#94a3b8' }) }}
                onClick={() => setStockView('price')}
              >Price</button>
              <button
                style={{ ...s.btn, ...(stockView === 'financials' ? {} : { background: '#1e2130', border: '1px solid #2d3148', color: '#94a3b8' }) }}
                onClick={() => setStockView('financials')}
              >Financials</button>

              <select
                style={{ ...s.select, minWidth: '180px' }}
                value={stockSymbol}
                onChange={e => setStockSymbol(e.target.value)}
              >
                {STOCK_OPTIONS.map(o => (
                  <option key={o.symbol} value={o.symbol}>{o.name} ({o.symbol})</option>
                ))}
              </select>

              {stockView === 'financials' && (
                <select
                  style={{ ...s.select, minWidth: '150px' }}
                  value={metricKey}
                  onChange={e => setMetricKey(e.target.value)}
                >
                  {FUNDAMENTAL_METRICS.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              )}

              <select
                style={{ ...s.select, flex: 1, minWidth: '160px' }}
                value={selectedKey}
                onChange={e => setSelectedKey(e.target.value)}
              >
                <option value="demo">Demo key (IBM · AAPL · MSFT)</option>
                {savedKeys.map(e => (
                  <option key={e.label} value={e.label}>{e.label}</option>
                ))}
              </select>
              <button
                style={{ ...s.btn, background: '#1e2130', border: '1px solid #2d3148', color: '#94a3b8', padding: '7px 12px' }}
                onClick={() => setAddingKey(a => !a)}
                title="Add API key"
              >＋ Add key</button>
              {selectedKey !== 'demo' && (
                <button
                  style={{ ...s.btn, background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5', padding: '7px 12px' }}
                  onClick={() => removeKey(selectedKey)}
                  title="Remove selected key"
                >Remove</button>
              )}
              <button
                style={{ ...s.btn, ...(stockLoading ? s.btnDisabled : {}) }}
                onClick={() => stockView === 'price'
                  ? fetchStock(stockSymbol, activeKeyValue, PRICE_PERIODS.find(p => p.label === pricePeriod))
                  : fetchFundamentals(stockSymbol, activeKeyValue, metricKey, finPeriod)
                }
                disabled={stockLoading}
              >
                {stockLoading ? 'Loading…' : stockView === 'price' ? 'Load Data' : 'Load Financials'}
              </button>
            </div>

            {/* Period picker */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={s.hint}>Period:</span>
              {(stockView === 'price' ? PRICE_PERIODS : FINANCIALS_PERIODS).map(p => {
                const active = stockView === 'price' ? p.label === pricePeriod : p.quarters === finPeriod;
                return (
                  <button
                    key={p.label}
                    style={{
                      ...s.btn,
                      padding: '4px 10px',
                      fontSize: '12px',
                      ...(active ? {} : { background: '#1e2130', border: '1px solid #2d3148', color: '#64748b' }),
                    }}
                    onClick={() => stockView === 'price' ? setPricePeriod(p.label) : setFinPeriod(p.quarters)}
                  >{p.label}</button>
                );
              })}
              <span style={{ ...s.hint, marginLeft: '8px' }}>Color:</span>
              <input
                type="color"
                value={chartColor}
                onChange={e => { setChartColor(e.target.value); localStorage.setItem('stock_color', e.target.value); }}
                style={{ width: '32px', height: '28px', padding: '2px', background: '#1e2130', border: '1px solid #2d3148', borderRadius: '6px', cursor: 'pointer' }}
                title="Chart color"
              />
              <button
                style={{ ...s.btn, background: '#1e2130', border: '1px solid #2d3148', color: '#64748b', padding: '4px 10px', fontSize: '12px' }}
                onClick={() => { setChartColor('#818cf8'); localStorage.setItem('stock_color', '#818cf8'); }}
              >Reset</button>
            </div>
            {addingKey && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '10px 12px', background: '#1a1d27', borderRadius: '8px', border: '1px solid #2d3148' }}>
                <input
                  style={{ ...s.input, width: '120px' }}
                  value={newKeyLabel}
                  onChange={e => setNewKeyLabel(e.target.value)}
                  placeholder="Label (e.g. Personal)"
                  autoFocus
                />
                <input
                  style={{ ...s.input, flex: 1, minWidth: '200px' }}
                  value={newKeyValue}
                  onChange={e => setNewKeyValue(e.target.value)}
                  placeholder="Alpha Vantage API key"
                  type="password"
                />
                <button style={s.btn} onClick={saveKey}>Save</button>
                <button
                  style={{ ...s.btn, background: 'none', border: '1px solid #2d3148', color: '#64748b' }}
                  onClick={() => { setAddingKey(false); setNewKeyLabel(''); setNewKeyValue(''); }}
                >Cancel</button>
              </div>
            )}
          </div>
        )}

        {tab === 'Sports' && (
          <div style={s.controls}>
            <select style={s.select} value={sport} onChange={e => setSport(e.target.value)}>
              {SPORTS_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <button
              style={{ ...s.btn, ...(sportsLoading ? s.btnDisabled : {}) }}
              onClick={() => fetchSports(sport)}
              disabled={sportsLoading}
            >
              {sportsLoading ? 'Loading…' : 'Load Standings'}
            </button>
            <span style={s.hint}>Live data via ESPN · no key needed</span>
          </div>
        )}

        {tab === 'Cricket' && (
          <div style={{ ...s.controls, flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={{ ...s.btn, ...(cricketMode === 'sample' ? {} : { background: '#1e2130', border: '1px solid #2d3148', color: '#94a3b8' }) }}
                onClick={() => setCricketMode('sample')}
              >Sample Data</button>
              <button
                style={{ ...s.btn, ...(cricketMode === 'live' ? {} : { background: '#1e2130', border: '1px solid #2d3148', color: '#94a3b8' }) }}
                onClick={() => setCricketMode('live')}
              >Live IPL</button>
            </div>

            {cricketMode === 'sample' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  style={{ ...s.select, flex: 1 }}
                  value={matchId}
                  onChange={e => { setMatchId(e.target.value); loadSample(e.target.value); }}
                >
                  {SAMPLE_MATCHES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            {cricketMode === 'live' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    style={{ ...s.input, flex: 1, minWidth: '200px' }}
                    value={cricKey}
                    onChange={e => { setCricKey(e.target.value); localStorage.setItem('cric_key', e.target.value); }}
                    placeholder="CricAPI key — get free key at cricapi.com"
                    type="password"
                  />
                  <button
                    style={{ ...s.btn, ...(cricketLoading ? s.btnDisabled : {}) }}
                    onClick={() => fetchIPLMatches(cricKey)}
                    disabled={cricketLoading || !cricKey}
                  >{cricketLoading ? 'Loading…' : 'Find IPL Matches'}</button>
                </div>

                {liveMatches.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      style={{ ...s.select, flex: 1 }}
                      value={selectedLive}
                      onChange={e => setSelectedLive(e.target.value)}
                    >
                      <option value="">— Select a match —</option>
                      {liveMatches.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <button
                      style={{ ...s.btn, ...(cricketLoading || !selectedLive ? s.btnDisabled : {}) }}
                      onClick={() => fetchMatchScorecard(cricKey, selectedLive, liveMatches.find(m => m.id === selectedLive)?.name)}
                      disabled={cricketLoading || !selectedLive}
                    >{cricketLoading ? 'Loading…' : 'Load Scorecard'}</button>
                  </div>
                )}

                <span style={s.hint}>Free tier at cricapi.com · scorecard available after innings complete</span>
              </div>
            )}
          </div>
        )}

        {/* GIF export bar */}
        <div style={s.gifBar}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>GIF Export</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={s.dimLabel}>FPS</span>
            <select style={s.select} value={gif.fps} onChange={e => setGif(g => ({ ...g, fps: Number(e.target.value) }))}>
              {[12, 15, 20, 24, 30].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={s.dimLabel}>Frames</span>
            <select style={s.select} value={gif.numFrames} onChange={e => setGif(g => ({ ...g, numFrames: Number(e.target.value) }))}>
              <option value={36}>36 (~1.5s)</option>
              <option value={48}>48 (~2s)</option>
              <option value={72}>72 (~3s)</option>
              <option value={96}>96 (~4s)</option>
              <option value={120}>120 (~5s)</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <ExportButton chartRef={chartRef} settings={gif} filename={exportFilename} />
          </div>
        </div>
      </main>
    </div>
  );
}
