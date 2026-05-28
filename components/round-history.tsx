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
    <div className="grid min-w-0 gap-4">
      {rounds.map((round) => (
        <section key={round.id} className="app-card min-w-0 p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h4 className="text-lg font-black text-[var(--app-text)]">Ronda {round.number}</h4>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    round.status === "completed"
                      ? "bg-[var(--brand-accent-soft)] text-[var(--brand-secondary)]"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {round.status === "completed" ? "Guardada" : "En juego"}
                </span>
              </div>
              {round.restingPlayerIds.length ? (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Descansan: {formatPlayerList(round.restingPlayerIds, names)}
                </p>
              ) : null}
            </div>

            {roundHasScores(round) && (!editableRoundId || editableRoundId === round.id) ? (
              <button
                type="button"
                onClick={() => onEdit(round.id)}
                className="app-button app-button-secondary w-full px-4 py-2 text-sm md:w-auto"
              >
                Editar esta ronda
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {round.matches.map((match) => (
              <div
                key={match.id}
                className="flex min-w-0 flex-col gap-2 rounded-[1.25rem] bg-[var(--surface-subtle)] px-3 py-3 text-sm text-[var(--app-text)] md:flex-row md:items-center md:justify-between md:px-4"
              >
                <span className="min-w-0 break-words font-semibold">
                  Cancha {match.court}: {formatTeam(match, "A", names)}
                </span>
                <span className="self-start rounded-full bg-[var(--surface-strong)] px-3 py-1 text-center font-black text-[var(--app-text)] md:self-auto">
                  {match.score ? `${match.score.teamA} - ${match.score.teamB}` : "Sin score"}
                </span>
                <span className="min-w-0 break-words font-semibold">{formatTeam(match, "B", names)}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
