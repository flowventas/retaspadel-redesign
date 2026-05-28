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
  disabled,
  onAdjust,
}: {
  value: number | null;
  max: number;
  disabled: boolean;
  onAdjust: (delta: -1 | 1) => void;
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-end gap-2 self-end sm:w-auto sm:self-auto">
      <button
        type="button"
        onClick={() => onAdjust(-1)}
        disabled={disabled || value === null || value <= 0}
        aria-label="Restar un juego"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] text-xl font-black text-[var(--app-text)] transition hover:border-[var(--brand-primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:text-[var(--muted)] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl"
      >
        -
      </button>
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--surface-strong)] text-xl font-black text-[var(--app-text)] sm:h-14 sm:w-16 sm:rounded-2xl sm:text-2xl">
        {value ?? ""}
      </div>
      <button
        type="button"
        onClick={() => onAdjust(1)}
        disabled={disabled || value === max}
        aria-label="Sumar un juego"
        className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] text-xl font-black text-[var(--app-text)] transition hover:border-[var(--brand-primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:text-[var(--muted)] sm:h-12 sm:w-12 sm:rounded-2xl sm:text-2xl"
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

  return (
    <article className="app-card min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
            Cancha {match.court}
          </p>
          <h4 className="mt-1 text-lg font-black text-[var(--app-text)]">Partido {match.court}</h4>
        </div>
        <div className="app-pill self-start bg-[var(--surface-soft)] px-3 py-1 text-xs">
          A {gamesPerMatch} juegos
        </div>
      </div>

      <div className="grid gap-3">
        <div
          className={`rounded-[1.5rem] border px-4 py-4 ${
            winner === "A" ? "border-[var(--brand-accent)] bg-[var(--brand-accent-soft)]" : "border-[var(--line)] bg-[var(--surface-subtle)]"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted)]">Pareja A</p>
          <div className="mt-2 flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="min-w-0 break-words pr-1 text-base font-bold text-[var(--app-text)]">
              {formatTeam(match, "A", names)}
            </p>
            <ScoreStepper
              value={score?.teamA ?? null}
              max={gamesPerMatch}
              disabled={disabled}
              onAdjust={(delta) => onAdjustScore(match.id, delta)}
            />
          </div>
        </div>

        <div
          className={`rounded-[1.5rem] border px-4 py-4 ${
            winner === "B" ? "border-[var(--brand-accent)] bg-[var(--brand-accent-soft)]" : "border-[var(--line)] bg-[var(--surface-subtle)]"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--muted)]">Pareja B</p>
          <div className="mt-2 flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="min-w-0 break-words pr-1 text-base font-bold text-[var(--app-text)]">
              {formatTeam(match, "B", names)}
            </p>
            <div className="grid h-12 w-12 shrink-0 place-items-center self-end rounded-xl bg-[var(--surface-strong)] text-xl font-black text-[var(--app-text)] md:h-14 md:w-16 md:self-auto md:rounded-2xl md:text-2xl">
              {score?.teamB ?? ""}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
