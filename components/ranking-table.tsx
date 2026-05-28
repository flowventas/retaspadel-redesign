import { RankingRow } from "@/lib/types";

type RankingTableProps = {
  rows: RankingRow[];
};

export function RankingTable({ rows }: RankingTableProps) {
  return (
    <div className="overflow-hidden border border-[var(--s-line)] bg-[var(--s-surf)]">
      <div className="border-b border-[var(--s-line)] px-4 py-4">
        <div>
          <p className="s-kicker text-[var(--s-lime)]">
            Tabla de poder · live
          </p>
          <h3 className="mt-2 font-display text-[30px] uppercase leading-none text-[var(--s-text)]">Clasificacion actual</h3>
          <p className="mt-2 text-[12px] leading-5 text-[var(--s-mid)]">
            Despues de cada ronda, el ranking se actualiza solo. Aqui no hay excusas.
          </p>
        </div>
        {rows[0] ? (
          <div className="mt-3 inline-flex border border-[var(--s-lime)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-lime)]">
            Lider · {rows[0].name}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <caption className="sr-only">Tabla de poder actual de la reta</caption>
          <thead className="bg-[var(--s-surf)] text-[var(--s-mid)]">
            <tr>
              {["POS", "Jugador", "G·P·E", "Dif", "Pts"].map((header) => (
                <th key={header} scope="col" className="border-b border-[var(--s-line)] px-3 py-2 text-left font-mono text-[9px] font-semibold uppercase tracking-[0.14em] min-[420px]:px-4">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.playerId}
                className={`relative border-b border-[var(--s-line)] ${index === 0 ? "bg-[rgba(212,255,78,0.06)]" : "bg-[var(--s-surf)]"}`}
              >
                <td className={`px-3 py-3 font-display text-[22px] italic leading-none min-[420px]:px-4 ${index === 0 ? "text-[var(--s-lime)]" : index < 3 ? "text-[var(--s-text)]" : "text-[var(--s-mid)]"}`}>
                  {String(index + 1).padStart(2, "0")}
                </td>
                <td className="max-w-[8rem] px-3 py-3 text-[13px] font-semibold text-[var(--s-text)] min-[420px]:max-w-none min-[420px]:px-4">
                  <span className="block truncate">{row.name}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] text-[var(--s-mid)] min-[420px]:px-4">
                  <span className="text-[var(--s-lime)]">{row.wins}</span>·<span className="text-[var(--s-red)]">{row.losses}</span>·{row.draws}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-3 font-mono text-[12px] font-semibold ${row.gameDiff > 0 ? "text-[var(--s-lime)]" : row.gameDiff < 0 ? "text-[var(--s-red)]" : "text-[var(--s-mid)]"} min-[420px]:px-4`}
                >
                  {row.gameDiff >= 0 ? `+${row.gameDiff}` : row.gameDiff}
                </td>
                <td className={`whitespace-nowrap px-3 py-3 text-right font-display text-[22px] italic leading-none min-[420px]:px-4 ${index === 0 ? "text-[var(--s-lime)]" : "text-[var(--s-text)]"}`}>
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
