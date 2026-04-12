# GIF Generator

A browser-based tool for creating animated GIFs from financial and sports data visualisations. Load live data, customise the chart, and export a one-click GIF — no backend required.

## Features

### Stocks
- **Price chart** — animated line chart with area fill, volume bars, live dot, and smooth ease-out animation
- **Financials chart** — quarterly bar chart for Revenue, Gross Profit, EBITDA, Net Income, and Operating Income
- **Time periods** — 1M, 3M, 6M, 1Y, 2Y, and a custom Feb 28+ range
- **Color picker** — change the chart color; animation replays automatically with the new color
- **Replay button** — re-run the animation without re-fetching data
- **API key manager** — save multiple Alpha Vantage keys by label; falls back to cached data on rate limit
- **DEMO stock** — built-in seeded demo data for testing without an API key
- **Data caching** — results cached in localStorage with a warning banner when showing stale data

### Cricket
- **Live IPL data** — fetch live match scorecards via CricAPI
- **Sample matches** — built-in sample data for offline use
- **Worm chart** — animated over-by-over run comparison between both innings

### Sports
- **NBA standings** — live standings via ESPN (no API key needed)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### API Keys

| Data source | Key required | Where to get one |
|---|---|---|
| Stock price & financials | Optional (demo key works for IBM, AAPL, MSFT) | [alphavantage.co](https://www.alphavantage.co/support/#api-key) |
| Live IPL cricket | Yes | [cricapi.com](https://cricapi.com) |
| NBA standings | No | — |

## Exporting a GIF

1. Load data for any chart
2. Adjust FPS and frame count in the GIF Export bar
3. Click **Export GIF** — the file downloads automatically

## Tech Stack

- [React 19](https://react.dev) + [Vite](https://vite.dev)
- Canvas 2D API for all chart rendering (no D3 or SVG)
- [gif.js](https://jnordberg.github.io/gif.js/) for client-side GIF encoding via Web Workers
- [Alpha Vantage](https://www.alphavantage.co) for stock data
- [CricAPI](https://cricapi.com) for live cricket data
- [ESPN API](https://site.api.espn.com) for sports standings
