import Link from "next/link";
import { ThemeSync } from "@/components/theme-sync";
import { TournamentEvent } from "@/lib/events/types";

type TournamentEventViewProps = {
  event: TournamentEvent;
};

const STATUS_LABELS = {
  draft: "Borrador",
  published: "Publicado",
  in_progress: "En curso",
  completed: "Finalizado",
} as const;

const FORMAT_LABELS = {
  round_robin: "Round robin",
  single_elimination: "Eliminacion directa",
  hybrid: "Formato mixto",
} as const;

export function TournamentEventView({ event }: TournamentEventViewProps) {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-3 py-4 text-[var(--app-text)] sm:px-6 sm:py-6 lg:px-8">
      <ThemeSync />
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="app-hero grid gap-4 px-5 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/torneos" className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--brand-accent)]">
              Volver a torneos
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[var(--hero-text)]">
              {STATUS_LABELS[event.status]}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{event.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-[var(--hero-muted)] sm:text-base">{event.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Fechas</p>
              <p className="mt-2 text-lg font-black">
                {event.startsAt} al {event.endsAt}
              </p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Sede</p>
              <p className="mt-2 text-lg font-black">{event.venue.clubName}</p>
            </div>
            <div className="rounded-[1.5rem] bg-white/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Ubicacion</p>
              <p className="mt-2 text-lg font-black">{event.venue.city}</p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="app-card grid gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                Categorias
              </p>
              <h2 className="mt-2 text-2xl font-black">Base del torneo</h2>
            </div>

            <div className="grid gap-3">
              {event.categories.map((category) => (
                <div
                  key={category.id}
                  className="app-panel px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-lg font-black">{category.name}</p>
                    <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                      {FORMAT_LABELS[category.format]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {category.participantCount} participantes proyectados
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="app-card grid gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                Patrocinadores
              </p>
              <h2 className="mt-2 text-2xl font-black">Visibilidad del evento</h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {event.sponsors.map((sponsor) => (
                <span
                  key={sponsor.id}
                  className="rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--app-text)]"
                >
                  {sponsor.name}
                </span>
              ))}
            </div>

            <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4 text-sm text-[var(--muted)]">
              Este dominio ya quedo separado de retas. El siguiente paso natural es agregar standings,
              rondas y brackets por categoria sin tocar la tabla de poder actual.
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
