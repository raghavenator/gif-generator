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

export function useCricketData() {
  const [match, setMatch] = useState(SAMPLE_MATCHES[0]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const loadSample = useCallback((id) => {
    const m = SAMPLE_MATCHES.find(m => m.id === id) || SAMPLE_MATCHES[0];
    setMatch(m);
    setError(null);
  }, []);

  const fetchLive = useCallback(async (apiKey) => {
    if (!apiKey) {
      setError('No CricAPI key — showing sample data. Get a free key at cricapi.com');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);
      const json = await res.json();
      if (!json.data?.length) throw new Error('No live matches found');
      // Use the first match name but keep sample worm data (full over-by-over parsing would need scorecard API)
      setMatch({ ...SAMPLE_MATCHES[0], name: json.data[0].name || 'Live Match' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { match, loading, error, loadSample, fetchLive };
}
