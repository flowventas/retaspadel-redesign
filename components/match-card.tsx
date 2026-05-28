import { formatTeam, matchWinner } from "@/lib/tournament";
import { GamesPerMatch, Match } from "@/lib/types";

type MatchCardProps = {
  match: Match;
  names: Record<string, string>;
  gamesPerMatch: GamesPerMatch;
  disabled?: boolean;
  onAdjustScore: (matchId: string, delta: -1 | 1) => void;
};

function ScoreStepper({
  value,
  max,
  won,
  disabled,
  onAdjust,
}: {
  value: number | null;
  max: number;
  won: boolean;
  disabled: boolean;
  onAdjust: (delta: -1 | 1) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={disabled || value === null || value <= 0}
        aria-label="Restar un juego"
        className="grid h-12 w-[38px] place-items-center border border-[var(--s-line-hi)] bg-transparent font-display text-[28px] italic leading-none text-[var(--s-text)] disabled:cursor-not-allowed disabled:border-[var(--s-line)] disabled:text-[var(--s-dim)]"
      >
        −
      </button>
      <div className={`s-score-box ${won ? "s-score-box-winner" : ""}`}>
        {value ?? ""}
      </div>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        disabled={disabled || value === max}
        aria-label="Sumar un juego"
        className="grid h-12 w-[38px] place-items-center border border-[var(--s-lime)] bg-[var(--s-lime)] font-display text-[28px] italic leading-none text-[var(--s-bg)] disabled:cursor-not-allowed disabled:border-[var(--s-line)] disabled:bg-transparent disabled:text-[var(--s-dim)]"
      >
        +
      </button>
    </div>
  );
}

export function MatchCard({
  match,
  names,
  gamesPerMatch,
  disabled = false,
  onAdjustScore,
}: MatchCardProps) {
  const score = match.score;
  const winner = matchWinner(match.score);
  const total = (score?.teamA ?? 0) + (score?.teamB ?? 0);
  const remaining = gamesPerMatch - total;
  const finished = total === gamesPerMatch;
  const teamAName = formatTeam(match, "A", names);
  const teamBName = formatTeam(match, "B", names);

  return (
    <article className={`relative min-w-0 overflow-hidden border bg-[var(--s-surf)] ${finished ? "border-[var(--s-lime)]" : "border-[var(--s-line)]"}`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background:linear-gradient(90deg,transparent_49%,var(--s-text)_50%,transparent_51%),linear-gradient(0deg,transparent_49%,var(--s-text)_50%,transparent_51%)] [background-size:80px_44px]" />

      <div className="relative flex items-center justify-between gap-3 border-b border-[var(--s-line)] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-[18px] w-[18px] place-items-center bg-[var(--s-lime)] font-display text-[13px] text-[var(--s-bg)]">
            {match.court}
          </span>
          <p className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--s-text)]">
            Cancha {match.court}
          </p>
        </div>
        <p className={`whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] ${finished ? "text-[var(--s-lime)]" : total ? "text-[var(--s-amber)]" : "text-[var(--s-mid)]"}`}>
          {finished ? (winner === "draw" ? "Empate" : "Completo ✓") : total ? `En juego · ${remaining} rest.` : "Por jugar"}
        </p>
      </div>

      <div className="relative">
        <div className="flex min-w-0 items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className={`font-mono text-[9px] uppercase tracking-[0.15em] ${winner === "A" ? "text-[var(--s-lime)]" : "text-[var(--s-mid)]"}`}>
              Eq. A
            </p>
            <p className={`mt-1 break-words text-[13px] font-semibold leading-4 ${winner === "B" ? "text-[var(--s-mid)] line-through decoration-[var(--s-dim)]" : "text-[var(--s-text)]"}`}>
              {teamAName}
            </p>
          </div>
            <ScoreStepper
              value={score?.teamA ?? null}
              max={gamesPerMatch}
              won={winner === "A"}
              disabled={disabled}
              onAdjust={(delta) => onAdjustScore(match.id, delta)}
            />
        </div>

        <div className="relative mx-3 h-px bg-[var(--s-line)]">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--s-surf)] px-2 font-display text-[14px] italic text-[var(--s-mid)]">
            vs
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-3 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className={`font-mono text-[9px] uppercase tracking-[0.15em] ${winner === "B" ? "text-[var(--s-lime)]" : "text-[var(--s-mid)]"}`}>
              Eq. B
            </p>
            <p className={`mt-1 break-words text-[13px] font-semibold leading-4 ${winner === "A" ? "text-[var(--s-mid)] line-through decoration-[var(--s-dim)]" : "text-[var(--s-text)]"}`}>
              {teamBName}
            </p>
          </div>
          <div className={`s-score-box ${winner === "B" ? "s-score-box-winner" : ""}`}>
              {score?.teamB ?? ""}
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--s-line)] px-3 py-2.5">
          <div className="flex flex-1 gap-[3px]">
            {Array.from({ length: gamesPerMatch }).map((_, index) => {
              const isA = index < (score?.teamA ?? 0);
              const isB = index >= (score?.teamA ?? 0) && index < total;
              return (
                <span
                  key={`${match.id}-progress-${index}`}
                  className={`h-1.5 flex-1 ${isA ? "bg-[var(--s-lime)]" : isB ? "bg-[var(--s-text)] opacity-60" : "bg-[var(--s-line-hi)]"}`}
                />
              );
            })}
          </div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.04em] text-[var(--s-text)]">
            {score ? `${score.teamA}-${score.teamB}` : `0-${gamesPerMatch}`} <span className="text-[var(--s-dim)]">/{gamesPerMatch}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
