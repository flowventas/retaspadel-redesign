import { RankingRow } from "@/lib/types";

type RankingTableProps = {
  rows: RankingRow[];
};

export function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="app-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
            Tabla de poder
          </p>
          <h3 className="mt-1 text-xl font-black text-[var(--app-text)]">Clasificacion actual</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Despues de cada ronda, el ranking se actualiza solo. Aqui no hay excusas.
          </p>
        </div>
        {rows[0] ? (
          <div className="app-pill bg-[var(--brand-accent-soft)] px-4 py-2 text-sm text-[var(--brand-secondary)]">
            Lider de la reta: {rows[0].name}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs min-[420px]:text-sm">
          <caption className="sr-only">Tabla de poder actual de la reta</caption>
          <thead className="bg-[var(--surface-subtle)] text-[var(--muted)]">
            <tr>
              {["#", "Jugador", "G-P-E", "Dif.", "P"].map((header) => (
                <th key={header} scope="col" className="px-3 py-3 text-left font-bold min-[420px]:px-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.playerId}
                className={`border-t border-[var(--line)] ${index === 0 ? "bg-[var(--brand-accent-soft)]" : "bg-[var(--card)]"}`}
              >
                <td className="px-3 py-3 font-black text-[var(--app-text)] min-[420px]:px-4">{index + 1}</td>
                <td className="max-w-[8rem] px-3 py-3 font-semibold text-[var(--app-text)] min-[420px]:max-w-none min-[420px]:px-4">
                  <span className="block truncate">{row.name}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[var(--muted)] min-[420px]:px-4">
                  {row.wins}-{row.losses}-{row.draws}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-3 font-bold ${row.gameDiff >= 0 ? "text-[var(--brand-secondary)]" : "text-rose-700"} min-[420px]:px-4`}
                >
                  {row.gameDiff > 0 ? `+${row.gameDiff}` : row.gameDiff}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-black text-[var(--brand-secondary)] min-[420px]:px-4">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
