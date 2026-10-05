import venuesFile from "@/data/venues.json";
import { teamAbbr, type WatchRow } from "@/lib/desk";

type Venue = { lat: number; lng: number; stadium: string; tz: string };

const VENUES = venuesFile.venues as Record<string, Venue>;

function project(lat: number, lng: number) {
  const x = ((lng + 125) / 58) * 100;
  const y = ((49.5 - lat) / 25.5) * 100;
  return { x: Math.min(98, Math.max(2, x)), y: Math.min(96, Math.max(4, y)) };
}

export function SlateMap({ rows, highlight }: { rows: WatchRow[]; highlight?: string | null }) {
  const seen = new Set<string>();
  const points = [];
  for (const r of rows) {
    const v = VENUES[r.home];
    if (!v || seen.has(r.home)) continue;
    seen.add(r.home);
    const p = project(v.lat, v.lng);
    points.push({
      ...p,
      name: r.home,
      stadium: v.stadium,
      league: r.league,
      id: r.eventId ?? r.home,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Venue slate</h3>
          <p className="mt-1 text-sm text-muted">
            Kickoff sites for research rows with mapped stadiums. Travel is not a model input until
            the rest/travel feature is verified.
          </p>
        </div>
        <p className="font-mono text-xs text-subtle">{points.length} mapped</p>
      </div>
      <svg
        viewBox="0 0 100 62"
        className="h-auto w-full"
        role="img"
        aria-label="Map of this week's mapped kickoff venues"
      >
        <rect width="100" height="62" fill="#1a1a1e" rx="2" />
        <path
          d="M8 18 L18 12 L32 10 L44 8 L58 9 L72 12 L86 18 L90 28 L88 42 L78 50 L62 54 L48 52 L34 54 L22 50 L12 40 L8 28 Z"
          fill="none"
          stroke="#3f3f46"
          strokeWidth="0.4"
        />
        {points.map((p) => {
          const on = highlight === p.name;
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y} r={on ? 2.4 : 1.5} fill={on ? "#c4b08a" : "#d4d4d8"} />
              <text
                x={p.x}
                y={p.y - 2.6}
                textAnchor="middle"
                fontSize="2.4"
                fill={on ? "#c4b08a" : "#a1a1aa"}
                fontFamily="IBM Plex Mono, ui-monospace, monospace"
              >
                {teamAbbr(p.name)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {points.slice(0, 8).map((p) => (
          <li key={p.id} className="font-mono text-[11px] text-subtle">
            {teamAbbr(p.name)} · {p.stadium}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function venueFor(home: string) {
  return VENUES[home] ?? null;
}
