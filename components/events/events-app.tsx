"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeSync } from "@/components/theme-sync";
import { loadStore } from "@/lib/storage";
import { sampleEvents } from "@/lib/events/sample";

const STATUS_LABELS = {
  draft: "Borrador",
  published: "Publicado",
  in_progress: "En curso",
  completed: "Finalizado",
} as const;

export function EventsApp() {
  const store = loadStore();

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <ThemeSync />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="app-hero mb-6 grid gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <BrandLogo theme={store.theme} variant="compact" className="mb-4" />
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-accent)]">
                Nuevo dominio
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Torneos 6 loco</h1>
              <p className="mt-3 max-w-3xl text-sm text-[var(--hero-muted)] sm:text-base">
                Aqui vamos a construir un flujo separado para torneos publicos, categorias y standings
                en vivo, sin romper lo que hoy ya funciona para retas.
              </p>
            </div>

            <Link href="/" className="app-button app-button-secondary px-4 py-3 text-sm">
              Volver a retas
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="app-card grid gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                Base inicial
              </p>
              <h2 className="mt-2 text-2xl font-black">Que vamos a separar aqui</h2>
            </div>

            <div className="grid gap-3 text-sm text-[var(--muted)]">
              <p>Portada publica del torneo con sede, fechas, categorias y patrocinadores.</p>
              <p>Participantes o parejas por categoria, sin mezclarlo con la tabla de poder de retas.</p>
              <p>Despues podremos crecer a standings, round robin, brackets y pagina compartible.</p>
            </div>
          </article>

          <article className="app-card grid gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                  Torneos demo
                </p>
                <h2 className="mt-2 text-2xl font-black">Primeros eventos</h2>
              </div>
              <span className="app-pill bg-[var(--surface-soft)] px-3 py-1 text-xs">
                {sampleEvents.length} total
              </span>
            </div>

            <div className="grid gap-3">
              {sampleEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/torneos/${event.slug}`}
                  className="app-panel app-panel-interactive grid gap-3 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-[var(--app-text)]">{event.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {event.venue.clubName} - {event.venue.city}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-bold text-[var(--brand-secondary)]">
                      {STATUS_LABELS[event.status]}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {event.categories.length} categorias - {event.teams.length} equipos demo
                  </p>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
