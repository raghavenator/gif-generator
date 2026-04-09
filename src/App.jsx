import { useState, useRef } from 'react';

import StockChart   from './visualizations/StockChart';
import SportsChart  from './visualizations/SportsChart';
import CricketChart from './visualizations/CricketChart';
import ExportButton from './components/ExportButton';

import { useStockData }                          from './hooks/useStockData';
import { useSportsData, SPORTS_OPTIONS }         from './hooks/useSportsData';
import { useCricketData, SAMPLE_MATCHES }        from './hooks/useCricketData';

const TABS = ['Stocks', 'Sports', 'Cricket'];

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
  const [tab, setTab] = useState('Cricket');
  const [gif, setGif] = useState({ fps: 24, numFrames: 72 });
  const chartRef = useRef(null);

  // Stock
  const { data: stockData, loading: stockLoading, error: stockError, fetchData: fetchStock } = useStockData();
  const [stockSymbol, setStockSymbol] = useState('IBM');
  const [stockKey,    setStockKey]    = useState('');

  // Sports
  const { teams, loading: sportsLoading, error: sportsError, label: sportsLabel, fetchData: fetchSports } = useSportsData();
  const [sport, setSport] = useState('nba');

  // Cricket
  const { match, error: cricketError, loadSample } = useCricketData();
  const [matchId, setMatchId] = useState(SAMPLE_MATCHES[0].id);

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

        {/* Chart */}
        <div style={s.card}>
          {tab === 'Stocks'  && <StockChart   ref={chartRef} data={stockData} symbol={stockSymbol} />}
          {tab === 'Sports'  && <SportsChart  ref={chartRef} teams={teams}    label={sportsLabel}  />}
          {tab === 'Cricket' && <CricketChart ref={chartRef} match={match} />}
        </div>

        {/* Controls */}
        {tab === 'Stocks' && (
          <div style={s.controls}>
            <input
              style={{ ...s.input, width: '140px' }}
              value={stockSymbol}
              onChange={e => setStockSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (IBM, AAPL…)"
            />
            <input
              style={{ ...s.input, flex: 1, minWidth: '180px' }}
              value={stockKey}
              onChange={e => setStockKey(e.target.value)}
              placeholder="Alpha Vantage key (blank = demo)"
              type="password"
            />
            <button
              style={{ ...s.btn, ...(stockLoading ? s.btnDisabled : {}) }}
              onClick={() => fetchStock(stockSymbol, stockKey || 'demo')}
              disabled={stockLoading}
            >
              {stockLoading ? 'Loading…' : 'Load Data'}
            </button>
            <span style={s.hint}>Demo key: IBM · AAPL · MSFT</span>
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
          <div style={s.controls}>
            <select
              style={{ ...s.select, flex: 1 }}
              value={matchId}
              onChange={e => { setMatchId(e.target.value); loadSample(e.target.value); }}
            >
              {SAMPLE_MATCHES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <span style={s.hint}>Sample match data included · add CricAPI key in .env for live</span>
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
            <ExportButton chartRef={chartRef} settings={gif} />
          </div>
        </div>
      </main>
    </div>
  );
}
