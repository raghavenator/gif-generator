import { useState, useCallback } from 'react';

export const SPORTS_OPTIONS = [
  { id: 'nba', label: 'NBA Basketball', path: 'basketball/nba' },
  { id: 'nfl', label: 'NFL Football',   path: 'football/nfl'   },
  { id: 'nhl', label: 'NHL Hockey',     path: 'hockey/nhl'     },
  { id: 'mlb', label: 'MLB Baseball',   path: 'baseball/mlb'   },
];

function parseEntries(entries) {
  return entries
    .map(entry => {
      const team  = entry.team  || {};
      const stats = entry.stats || [];
      const wins   = stats.find(s => s.name === 'wins')?.value        ?? 0;
      const losses = stats.find(s => s.name === 'losses')?.value      ?? 0;
      const pct    = stats.find(s => s.name === 'winPercent')?.value  ?? 0;
      return {
        id:    team.id,
        name:  team.displayName || team.name || 'Unknown',
        abbr:  team.abbreviation || '',
        color: '#' + (team.color            || '6366f1'),
        alt:   '#' + (team.alternateColor   || '818cf8'),
        wins:  Math.round(wins),
        losses: Math.round(losses),
        pct:   parseFloat(pct) || 0,
      };
    })
    .filter(t => t.wins > 0 || t.losses > 0)
    .sort((a, b) => b.wins - a.wins || b.pct - a.pct)
    .slice(0, 16);
}

export function useSportsData() {
  const [teams,   setTeams]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [label,   setLabel]   = useState('');

  const fetchData = useCallback(async (sportId = 'nba') => {
    const sport = SPORTS_OPTIONS.find(s => s.id === sportId) || SPORTS_OPTIONS[0];
    setLabel(sport.label);
    setLoading(true);
    setError(null);

    try {
      const url = `https://site.api.espn.com/apis/v2/sports/${sport.path}/standings`;
      const res  = await fetch(url);
      const json = await res.json();

      // ESPN can nest under children (conference splits)
      const entries =
        json?.standings?.entries ||
        json?.children?.[0]?.standings?.entries ||
        json?.children?.flatMap(c => c.standings?.entries || []) ||
        [];

      const parsed = parseEntries(entries);
      if (!parsed.length) throw new Error('No standings data returned from ESPN.');
      setTeams(parsed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { teams, loading, error, label, fetchData };
}
