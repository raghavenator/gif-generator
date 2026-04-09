import { useState, useCallback } from 'react';

// Bundled sample match data (over-by-over worm chart data)
export const SAMPLE_MATCHES = [
  {
    id: 'wc2023-final',
    name: '2023 ODI World Cup Final — India vs Australia',
    format: 'ODI',
    team1: {
      name: 'India', color: '#3b82f6',
      overs: [
        {r:2,w:0},{r:6,w:0},{r:4,w:0},{r:8,w:0},{r:5,w:1},{r:9,w:0},{r:7,w:0},{r:3,w:1},
        {r:5,w:0},{r:6,w:0},{r:4,w:1},{r:3,w:0},{r:7,w:0},{r:5,w:0},{r:8,w:0},{r:4,w:0},
        {r:6,w:1},{r:9,w:0},{r:3,w:0},{r:5,w:0},{r:7,w:1},{r:4,w:0},{r:6,w:0},{r:3,w:0},
        {r:5,w:0},{r:8,w:0},{r:2,w:1},{r:4,w:0},{r:6,w:0},{r:8,w:0},{r:5,w:0},{r:3,w:0},
        {r:7,w:1},{r:4,w:0},{r:9,w:0},{r:5,w:0},{r:6,w:0},{r:4,w:1},{r:3,w:0},{r:5,w:0},
        {r:7,w:0},{r:8,w:1},{r:4,w:0},{r:6,w:0},{r:3,w:0},{r:5,w:0},{r:2,w:0},{r:8,w:1},
        {r:4,w:0},{r:6,w:0},
      ],
    },
    team2: {
      name: 'Australia', color: '#f59e0b',
      overs: [
        {r:3,w:0},{r:8,w:0},{r:6,w:0},{r:4,w:0},{r:7,w:0},{r:5,w:0},{r:9,w:0},{r:4,w:0},
        {r:6,w:0},{r:8,w:0},{r:3,w:0},{r:7,w:1},{r:5,w:0},{r:4,w:0},{r:6,w:0},{r:8,w:0},
        {r:7,w:0},{r:5,w:0},{r:9,w:0},{r:4,w:0},{r:6,w:0},{r:8,w:1},{r:5,w:0},{r:7,w:0},
        {r:4,w:0},{r:6,w:0},{r:9,w:0},{r:5,w:0},{r:7,w:0},{r:8,w:0},{r:4,w:0},{r:6,w:0},
        {r:5,w:0},{r:7,w:1},{r:9,w:0},{r:6,w:0},{r:8,w:0},{r:4,w:0},{r:5,w:0},{r:7,w:0},
        {r:6,w:0},{r:8,w:0},{r:4,w:0},{r:9,w:0},
      ],
    },
  },
  {
    id: 't20-2024-final',
    name: '2024 T20 World Cup Final — India vs South Africa',
    format: 'T20',
    team1: {
      name: 'India', color: '#3b82f6',
      overs: [
        {r:4,w:0},{r:6,w:0},{r:8,w:0},{r:5,w:0},{r:7,w:1},{r:3,w:0},{r:9,w:0},{r:5,w:0},
        {r:6,w:1},{r:4,w:0},{r:8,w:0},{r:7,w:0},{r:5,w:1},{r:9,w:0},{r:6,w:0},{r:4,w:0},
        {r:8,w:1},{r:7,w:0},{r:5,w:0},{r:6,w:0},
      ],
    },
    team2: {
      name: 'South Africa', color: '#22c55e',
      overs: [
        {r:5,w:0},{r:9,w:0},{r:7,w:0},{r:4,w:0},{r:8,w:1},{r:6,w:0},{r:5,w:0},{r:9,w:0},
        {r:4,w:1},{r:7,w:0},{r:8,w:0},{r:5,w:0},{r:6,w:1},{r:4,w:0},{r:9,w:0},{r:7,w:1},
        {r:5,w:0},{r:3,w:1},{r:2,w:1},{r:4,w:0},
      ],
    },
  },
  {
    id: 'ashes-2023-headingley',
    name: '2023 Ashes 3rd Test — England vs Australia (Headingley)',
    format: 'Test',
    team1: {
      name: 'England', color: '#ef4444',
      overs: [
        {r:3,w:0},{r:5,w:0},{r:2,w:0},{r:6,w:0},{r:4,w:0},{r:7,w:1},{r:3,w:0},{r:5,w:0},
        {r:8,w:0},{r:4,w:0},{r:6,w:1},{r:3,w:0},{r:5,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:0},
        {r:8,w:0},{r:5,w:1},{r:3,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:0},{r:5,w:1},{r:8,w:0},
        {r:3,w:0},{r:5,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:1},{r:8,w:0},{r:5,w:0},{r:3,w:0},
        {r:7,w:0},{r:4,w:1},{r:6,w:0},{r:8,w:0},{r:5,w:0},{r:3,w:0},{r:7,w:0},{r:4,w:0},
        {r:6,w:0},{r:8,w:1},{r:5,w:0},{r:3,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:0},{r:5,w:1},
        {r:8,w:0},{r:3,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:0},{r:8,w:0},{r:5,w:0},{r:3,w:0},
        {r:7,w:1},{r:4,w:0},{r:6,w:0},{r:8,w:0},{r:5,w:0},{r:3,w:0},{r:7,w:0},{r:4,w:0},
        {r:6,w:0},{r:8,w:0},{r:5,w:1},{r:3,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:0},{r:8,w:0},
        {r:5,w:0},{r:3,w:0},{r:7,w:0},{r:4,w:0},{r:6,w:1},{r:8,w:0},{r:5,w:0},{r:9,w:0},
      ],
    },
    team2: {
      name: 'Australia', color: '#f59e0b',
      overs: [
        {r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:0},{r:5,w:1},{r:8,w:0},{r:4,w:0},{r:6,w:0},
        {r:3,w:0},{r:7,w:1},{r:5,w:0},{r:8,w:0},{r:4,w:0},{r:6,w:0},{r:3,w:1},{r:7,w:0},
        {r:5,w:0},{r:8,w:0},{r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:1},{r:5,w:0},{r:8,w:0},
        {r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:0},{r:5,w:1},{r:8,w:0},{r:4,w:0},{r:6,w:0},
        {r:3,w:0},{r:7,w:0},{r:5,w:0},{r:8,w:1},{r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:0},
        {r:5,w:0},{r:8,w:0},{r:4,w:1},{r:6,w:0},{r:3,w:0},{r:7,w:0},{r:5,w:0},{r:8,w:0},
        {r:4,w:0},{r:6,w:1},{r:3,w:0},{r:7,w:0},{r:5,w:0},{r:8,w:0},{r:4,w:0},{r:6,w:0},
        {r:3,w:1},{r:7,w:0},{r:5,w:0},{r:8,w:0},{r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:0},
        {r:5,w:1},{r:8,w:0},{r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:0},{r:5,w:0},{r:8,w:1},
        {r:4,w:0},{r:6,w:0},{r:3,w:0},{r:7,w:0},{r:5,w:0},{r:8,w:0},{r:4,w:0},{r:6,w:0},
      ],
    },
  },
];

// Team colours for IPL franchises
const IPL_COLOURS = {
  'Mumbai Indians':           '#004BA0',
  'Chennai Super Kings':      '#F9CD05',
  'Royal Challengers':        '#EC1C24',
  'Kolkata Knight Riders':    '#3A225D',
  'Delhi Capitals':           '#0078BC',
  'Sunrisers Hyderabad':      '#F7A721',
  'Punjab Kings':             '#ED1B24',
  'Rajasthan Royals':         '#254AA5',
  'Lucknow Super Giants':     '#A4DDED',
  'Gujarat Titans':           '#1C2951',
};

function teamColour(name) {
  for (const [key, colour] of Object.entries(IPL_COLOURS)) {
    if (name.includes(key) || key.includes(name.split(' ')[0])) return colour;
  }
  return '#818cf8';
}

// Reconstruct per-over {r, w} from bowling figures.
// Each bowler's overs are spread evenly across the overs they bowled.
function bowlingToOvers(bowlers, totalOvers = 20) {
  const overs = Array.from({ length: totalOvers }, () => ({ r: 0, w: 0 }));
  let cursor = 0;
  for (const b of bowlers) {
    const o = Math.round(parseFloat(b.o) || 0);
    const runsPerOver = o > 0 ? Math.round((parseInt(b.r) || 0) / o) : 0;
    const wickets = parseInt(b.w) || 0;
    // spread wickets across last over(s) of the spell
    for (let i = 0; i < o && cursor + i < totalOvers; i++) {
      overs[cursor + i].r = runsPerOver;
    }
    // assign all wickets to final over of the spell
    if (o > 0 && cursor + o - 1 < totalOvers) {
      overs[cursor + o - 1].w = wickets;
    }
    cursor += o;
    if (cursor >= totalOvers) break;
  }
  return overs;
}

function parseScorecardInnings(innings, totalOvers = 20) {
  const bowling = innings?.bowling || [];
  return bowlingToOvers(bowling, totalOvers);
}

export function useCricketData() {
  const [match,       setMatch]       = useState(SAMPLE_MATCHES[0]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const loadSample = useCallback((id) => {
    const m = SAMPLE_MATCHES.find(m => m.id === id) || SAMPLE_MATCHES[0];
    setMatch(m);
    setError(null);
  }, []);

  // Fetch list of current IPL matches
  const fetchIPLMatches = useCallback(async (apiKey) => {
    if (!apiKey) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.reason || 'CricAPI error');
      const ipl = (json.data || []).filter(m =>
        m.name?.toLowerCase().includes('ipl') ||
        m.series_id?.toLowerCase().includes('ipl') ||
        (m.matchType === 't20' && (
          m.teams?.some(t => Object.keys(IPL_COLOURS).some(k => t.includes(k.split(' ')[0])))
        ))
      );
      if (!ipl.length) throw new Error('No IPL matches currently live. Try again during a match.');
      setLiveMatches(ipl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch scorecard for a specific match and build worm data
  const fetchMatchScorecard = useCallback(async (apiKey, matchId, matchName) => {
    if (!apiKey || !matchId) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`https://api.cricapi.com/v1/match_scorecard?apikey=${apiKey}&id=${matchId}`);
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.reason || 'CricAPI error');

      const data      = json.data;
      const scorecard = data?.scorecard || [];
      const teams     = data?.teams || [];
      const totalOvers = data?.matchType === 't20' ? 20 : 50;

      if (scorecard.length < 1) throw new Error('Scorecard not yet available for this match.');

      const inn1 = scorecard[0];
      const inn2 = scorecard[1];

      const t1name = teams[0] || inn1?.inning?.split(' Inning')[0] || 'Team 1';
      const t2name = teams[1] || inn2?.inning?.split(' Inning')[0] || 'Team 2';

      setMatch({
        id:     matchId,
        name:   matchName || data?.name || 'IPL Match',
        format: data?.matchType?.toUpperCase() || 'T20',
        team1: {
          name:  t1name,
          color: teamColour(t1name),
          overs: inn1 ? parseScorecardInnings(inn1, totalOvers) : [],
        },
        team2: {
          name:  t2name,
          color: teamColour(t2name),
          overs: inn2 ? parseScorecardInnings(inn2, totalOvers) : [],
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { match, liveMatches, loading, error, loadSample, fetchIPLMatches, fetchMatchScorecard };
}
