import { formatPlayerList, formatTeam, roundHasScores } from "@/lib/tournament";
import { Round } from "@/lib/types";

type RoundHistoryProps = {
  rounds: Round[];
  names: Record<string, string>;
  onEdit: (roundId: string) => void;
  editableRoundId?: string;
};

export function RoundHistory({ rounds, names, onEdit, editableRoundId }: RoundHistoryProps) {
  return (
    <div className="grid min-w-0 gap-3">
      {rounds.map((round) => (
        <section key={round.id} className="min-w-0 border border-[var(--s-line)] bg-[var(--s-surf)] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="font-display text-[28px] uppercase leading-none text-[var(--s-text)]">
                  Ronda <span className="italic text-[var(--s-lime)]">{String(round.number).padStart(2, "0")}</span>
                </h4>
                <span
                  className={`border px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] ${
                    round.status === "completed"
                      ? "border-[var(--s-lime)] text-[var(--s-lime)]"
                      : "border-[var(--s-amber)] text-[var(--s-amber)]"
                  }`}
                >
                  {round.status === "completed" ? "Guardada" : "En juego"}
                </span>
              </div>
              {round.restingPlayerIds.length ? (
                <p className="mt-2 text-[12px] leading-5 text-[var(--s-mid)]">
                  Descansan: {formatPlayerList(round.restingPlayerIds, names)}
                </p>
              ) : null}
            </div>

            {roundHasScores(round) && (!editableRoundId || editableRoundId === round.id) ? (
              <button
                type="button"
                onClick={() => onEdit(round.id)}
                className="app-button app-button-secondary w-full px-4 py-2 text-[16px] md:w-auto"
              >
                Editar esta ronda
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2">
            {round.matches.map((match) => (
              <div
                key={match.id}
                className="grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 border border-[var(--s-line)] bg-[var(--s-bg)] px-3 py-3 text-[12px] text-[var(--s-text)]"
              >
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--s-mid)]">
                  C{match.court}
                </span>
                <span className="min-w-0 leading-5">
                  <span className="block truncate font-semibold text-[var(--s-text)]">{formatTeam(match, "A", names)}</span>
                  <span className="block truncate font-semibold text-[var(--s-mid)]">{formatTeam(match, "B", names)}</span>
                </span>
                <span className="font-display text-[22px] italic leading-none text-[var(--s-text)]">
                  {match.score ? `${match.score.teamA}—${match.score.teamB}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
      {!rounds.length ? (
        <div className="border border-dashed border-[var(--s-line-hi)] p-5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--s-dim)]">
          Aun no hay rondas guardadas
        </div>
      ) : null}
    </div>
  );
}
