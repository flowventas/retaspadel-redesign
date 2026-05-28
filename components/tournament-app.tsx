"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { NewTournamentForm } from "@/components/new-tournament-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { defaultStore, loadStore, saveStore } from "@/lib/storage";
import { createPlayers, createTournament } from "@/lib/tournament";
import { GamesPerMatch, PairingMode, PlayMode, TournamentFormat, TournamentStore } from "@/lib/types";

function mergeSavedPlayers(current: string[], incoming: string[]) {
  const seen = new Set<string>();
  const merged: string[] = [];

  [...incoming, ...current].forEach((name) => {
    const trimmed = name.trim();
    const key = trimmed.toLocaleLowerCase();
    if (!trimmed || seen.has(key)) {
      return;
    }

    seen.add(key);
    merged.push(trimmed);
  });

  return merged.slice(0, 40);
}

export default function TournamentApp() {
  const router = useRouter();
  const [hasLoadedStore, setHasLoadedStore] = useState(false);
  const [store, setStore] = useState<TournamentStore>(defaultStore);
  const formSectionRef = useRef<HTMLDivElement | null>(null);
  const savedSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setStore(loadStore());
    setHasLoadedStore(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStore) {
      return;
    }

    saveStore(store);
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [hasLoadedStore, store]);

  function handleCreateTournament(payload: {
    name: string;
    format: TournamentFormat;
    gamesPerMatch: GamesPerMatch;
    pairingMode: PairingMode;
    playMode: PlayMode;
    names: string[];
  }) {
    const tournament = createTournament(
      payload.name,
      createPlayers(payload.names),
      payload.format,
      payload.gamesPerMatch,
      payload.pairingMode,
      payload.playMode,
    );

    const nextStore = {
      ...store,
      tournaments: [tournament, ...store.tournaments],
      activeTournamentId: tournament.id,
      savedPlayers: mergeSavedPlayers(store.savedPlayers ?? [], payload.names),
    };

    setStore(nextStore);
    router.push(`/torneo/${tournament.id}`);
  }

  function handleDeleteTournament(tournamentId: string) {
    const tournament = store.tournaments.find((item) => item.id === tournamentId);
    if (!tournament) {
      return;
    }

    if (!window.confirm(`Borrar la reta "${tournament.name}"?`)) {
      return;
    }

    setStore((current) => {
      const remaining = current.tournaments.filter((item) => item.id !== tournamentId);
      return {
        ...current,
        tournaments: remaining,
        activeTournamentId:
          current.activeTournamentId === tournamentId ? remaining[0]?.id ?? null : current.activeTournamentId,
      };
    });
  }

  function handleThemeToggle() {
    setStore((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
  }

  function handleClearSavedPlayers() {
    setStore((current) => ({
      ...current,
      savedPlayers: [],
    }));
  }

  function handleRemoveSavedPlayer(name: string) {
    const normalized = name.trim().toLocaleLowerCase();
    setStore((current) => ({
      ...current,
      savedPlayers: current.savedPlayers.filter((item) => item.trim().toLocaleLowerCase() !== normalized),
    }));
  }

  function scrollToSection(target: HTMLDivElement | null) {
    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const tournaments = store.tournaments ?? defaultStore.tournaments;
  const completedTournaments = tournaments.filter((tournament) => tournament.completed).length;
  const activeTournaments = tournaments.length - completedTournaments;

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,_color-mix(in_srgb,var(--brand-accent)_10%,transparent),_transparent_46%),radial-gradient(circle_at_right,_color-mix(in_srgb,var(--brand-primary)_6%,transparent),_transparent_36%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="app-hero motion-hero mb-12 grid gap-8 px-6 py-6 md:mb-16 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:px-8 md:py-8">
          <div className="relative min-h-10">
            <BrandLogo
              theme={store.theme}
              className="mx-auto block min-[500px]:mr-14 min-[500px]:ml-auto"
            />
            <div className="absolute right-0 top-0">
              <ThemeToggle theme={store.theme} onToggle={handleThemeToggle} />
            </div>
          </div>
          <div className="grid gap-6 md:col-span-2 md:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] md:items-end">
            <div className="max-w-3xl">
              <p className="app-kicker text-[var(--hero-muted)]">Retas de padel organizadas en minutos</p>
              <h1 className="mt-3 text-5xl font-black tracking-tight text-[var(--hero-text)] sm:text-6xl lg:text-7xl">
                Organiza la reta, guarda cada score y deja claro quien manda.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-[var(--hero-muted)] sm:text-lg">
                6 loco te ayuda a armar partidos, capturar resultados desde el celular y mantener
                una tabla de poder lista para compartir.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => scrollToSection(formSectionRef.current)}
                  className="app-button app-button-primary w-full px-6 py-3 text-sm sm:w-auto sm:text-base"
                >
                  Crear una reta
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(savedSectionRef.current)}
                  className="app-button app-button-secondary w-full px-6 py-3 text-sm sm:w-auto sm:text-base"
                >
                  Ver retas guardadas
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--hero-muted)]">
                <span className="app-pill bg-white/58 px-3 py-2 text-[var(--hero-muted)] dark:bg-[color-mix(in_srgb,var(--surface-strong)_56%,transparent)] dark:text-[var(--hero-muted)]">
                  Rapida en celular
                </span>
                <span className="app-pill bg-white/58 px-3 py-2 text-[var(--hero-muted)] dark:bg-[color-mix(in_srgb,var(--surface-strong)_56%,transparent)] dark:text-[var(--hero-muted)]">
                  Importa desde WhatsApp
                </span>
                <span className="app-pill bg-white/58 px-3 py-2 text-[var(--hero-muted)] dark:bg-[color-mix(in_srgb,var(--surface-strong)_56%,transparent)] dark:text-[var(--hero-muted)]">
                  Tabla lista para compartir
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--hero-muted)]">
                <span>Sin cuenta obligatoria</span>
                <span>Datos guardados en este dispositivo</span>
                <span>Sin hojas ni chats sueltos</span>
              </div>
            </div>

            <div className="app-panel app-panel-interactive grid gap-4 px-5 py-5 md:max-w-sm md:justify-self-end">
              <p className="app-kicker">Lista para jugar</p>
              <h2 className="text-2xl font-black text-[var(--app-text)]">Menos organizacion, mas cancha.</h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[1rem] bg-[var(--surface-strong)] px-3 py-3 text-center shadow-[var(--shadow-soft)]">
                  <p className="text-xl font-black text-[var(--app-text)]">8-20</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">jugadores</p>
                </div>
                <div className="rounded-[1rem] bg-[var(--surface-strong)] px-3 py-3 text-center shadow-[var(--shadow-soft)]">
                  <p className="text-xl font-black text-[var(--app-text)]">5-6</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">juegos</p>
                </div>
                <div className="rounded-[1rem] bg-[var(--surface-strong)] px-3 py-3 text-center shadow-[var(--shadow-soft)]">
                  <p className="text-xl font-black text-[var(--app-text)]">1 tap</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--muted)]">para guardar</p>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)]">
                Ideal para grupos, clubes y retas privadas donde importa jugar rapido y llevar el
                orden sin hojas ni chats sueltos.
              </p>
              <div className="grid gap-2 rounded-[1.25rem] border border-[var(--line)] bg-[color-mix(in_srgb,var(--surface-strong)_72%,transparent)] px-4 py-4 text-sm">
                <p className="font-black text-[var(--app-text)]">Senales de confianza</p>
                <p className="text-[var(--muted)]">
                  Captura simple, guardado local y clasificacion visible para todo el grupo desde el
                  primer momento.
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="motion-card motion-delay-1 mb-12 grid gap-5 md:mb-16 md:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)] md:items-start">
          <div className="grid gap-3">
            <p className="app-kicker">Como funciona 6 loco</p>
            <h2 className="app-heading max-w-3xl">Una app para organizar la reta sin hojas, sin enredos y sin perder el ritmo.</h2>
            <p className="app-copy max-w-2xl">
              Configura el formato, importa jugadores desde WhatsApp, guarda cada score desde el
              celular y deja que la tabla de poder se acomode sola despues de cada ronda.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            <div className="app-panel app-panel-interactive px-4 py-4">
              <p className="text-sm font-black text-[var(--app-text)]">Arma la reta en minutos</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Desde 8 hasta 20 jugadores, con flujo rapido y listo para compartir.
              </p>
            </div>
            <div className="app-panel app-panel-interactive px-4 py-4">
              <p className="text-sm font-black text-[var(--app-text)]">Captura clara en cancha</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Scores simples, validacion por formato y scroll pensado para usarlo en vivo.
              </p>
            </div>
            <div className="app-panel app-panel-interactive px-4 py-4">
              <p className="text-sm font-black text-[var(--app-text)]">Tabla lista al instante</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                La clasificacion se actualiza sola para que todos vean quien va arriba.
              </p>
            </div>
          </div>
        </section>

        <section ref={formSectionRef} className="mb-12 grid gap-6 md:mb-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(18rem,0.95fr)] lg:items-start">
          <div className="motion-card motion-delay-1 grid content-start gap-4">
            <div className="grid gap-2">
              <p className="app-kicker">Empieza aqui</p>
              <h2 className="app-heading">Configura la proxima reta y arranca en minutos.</h2>
              <p className="app-copy max-w-2xl">
                Elige jugadores, modalidad y formato sin salirte del flujo principal. Todo lo que
                sigue en la app parte de este bloque.
              </p>
            </div>

            <NewTournamentForm
              onCreate={handleCreateTournament}
              savedPlayers={store.savedPlayers ?? []}
              onClearSavedPlayers={handleClearSavedPlayers}
              onRemoveSavedPlayer={handleRemoveSavedPlayer}
            />
          </div>

          <aside className="motion-card motion-delay-2 grid gap-4 content-start">
            <div className="app-card p-6">
              <p className="app-kicker">Lo esencial</p>
              <h3 className="mt-2 text-2xl font-black text-[var(--app-text)]">Pensada para organizar sin frenar la reta.</h3>
              <div className="mt-4 grid gap-3">
                <div className="app-panel app-panel-interactive px-4 py-4">
                  <p className="text-sm font-black text-[var(--app-text)]">Importa listas reales</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Pega mensajes de WhatsApp y evita volver a capturar nombres uno por uno.
                  </p>
                </div>
                <div className="app-panel app-panel-interactive px-4 py-4">
                  <p className="text-sm font-black text-[var(--app-text)]">Adapta la reta al grupo</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Retas rotativas, parejas fijas y escalera para grupos grandes.
                  </p>
                </div>
                <div className="app-panel app-panel-interactive px-4 py-4">
                  <p className="text-sm font-black text-[var(--app-text)]">Comparte resultados faciles</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Guarda scores en vivo y descarga la tabla de poder final en PNG.
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-4">
                <p className="text-sm font-black text-[var(--app-text)]">Hecha para grupos reales</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Ideal para organizar retas privadas, clubes o amistosos recurrentes sin meter al
                  grupo a un sistema pesado.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section ref={savedSectionRef} className="motion-card motion-delay-3 mb-12 grid gap-4 md:mb-16">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="app-kicker">Comunidad y seguimiento</p>
              <h2 className="app-heading">Retas guardadas para seguir donde se quedo la batalla.</h2>
              <p className="app-copy max-w-2xl">
                Aqui se concentra tu historial reciente, el avance de las retas activas y las
                clasificaciones que ya cerraste.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="app-pill bg-[var(--surface-soft)] px-3 py-2 text-xs">
                {activeTournaments} activas
              </span>
              <span className="app-pill bg-[var(--surface-soft)] px-3 py-2 text-xs">
                {completedTournaments} finalizadas
              </span>
              <span className="app-pill bg-[var(--surface-soft)] px-3 py-2 text-xs">
                {store.savedPlayers.length} jugadores recientes
              </span>
            </div>
          </div>

          <div className="grid content-start gap-6">
            <div className="app-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                    Guardados
                  </p>
                  <h2 className="mt-1 text-xl font-black text-[var(--app-text)]">Retas guardadas</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">Retoma una reta activa o revisa resultados anteriores.</p>
                </div>
                <span className="app-pill bg-[var(--surface-soft)] px-3 py-1 text-xs">
                  {tournaments.length} total
                </span>
              </div>

              {tournaments.length ? (
                <div className="mt-4 grid gap-3">
                  {tournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="app-panel app-panel-interactive px-4 py-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Link href={`/torneo/${tournament.id}`} className="min-w-0 flex-1 text-left">
                          <p className="font-black text-[var(--app-text)]">{tournament.name}</p>
                          <p className="text-sm text-[var(--muted)]">
                            {tournament.format} jugadores, a {tournament.gamesPerMatch} juegos,{" "}
                            {tournament.totalRounds} rondas,{" "}
                            {tournament.playMode === "ladder" ? "escalera" : "rotativo"},{" "}
                            {tournament.pairingMode === "fixed" ? "parejas fijas" : "parejas rotativas"}
                          </p>
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="app-pill border border-[var(--line)] px-3 py-1 text-xs text-[var(--app-text)]">
                            {tournament.completed ? "Finalizado" : "En curso"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTournament(tournament.id)}
                            className="app-button app-button-danger px-3 py-2 text-xs"
                          >
                            Borrar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-6 text-sm text-[var(--muted)]">
                  <div>
                    <p className="font-black text-[var(--app-text)]">Todavia no hay retas guardadas.</p>
                    <p className="mt-1">
                      Crea la primera y 6 loco te llevara directo a la vista de juego sin perder el
                      flujo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="app-pill bg-[var(--surface-strong)] px-3 py-2 text-xs">Guardado local automatico</span>
                    <span className="app-pill bg-[var(--surface-strong)] px-3 py-2 text-xs">Sin configuracion extra</span>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => scrollToSection(formSectionRef.current)}
                      className="app-button app-button-primary px-5 py-3 text-sm"
                    >
                      Crear una reta
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="motion-card motion-delay-3 pb-8">
          <div className="app-hero grid gap-5 px-6 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-8">
            <div>
              <p className="app-kicker text-[var(--hero-muted)]">Listo para jugar</p>
              <h2 className="mt-2 text-3xl font-black text-[var(--hero-text)] md:text-4xl">
                Cuando el grupo este listo, la app tambien deberia estarlo.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-[var(--hero-muted)] sm:text-base">
                Arma una reta nueva, importa nombres desde WhatsApp o vuelve a una guardada para
                seguir la competencia sin perder tiempo.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[var(--hero-muted)]">
                <span className="app-pill bg-white/58 px-3 py-2 text-[var(--hero-muted)] dark:bg-[color-mix(in_srgb,var(--surface-strong)_56%,transparent)] dark:text-[var(--hero-muted)]">
                  Guardado automatico
                </span>
                <span className="app-pill bg-white/58 px-3 py-2 text-[var(--hero-muted)] dark:bg-[color-mix(in_srgb,var(--surface-strong)_56%,transparent)] dark:text-[var(--hero-muted)]">
                  Scores claros en celular
                </span>
                <span className="app-pill bg-white/58 px-3 py-2 text-[var(--hero-muted)] dark:bg-[color-mix(in_srgb,var(--surface-strong)_56%,transparent)] dark:text-[var(--hero-muted)]">
                  Tabla final compartible
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <button
                type="button"
                onClick={() => scrollToSection(formSectionRef.current)}
                className="app-button app-button-primary w-full px-6 py-3 text-sm sm:w-auto sm:text-base"
              >
                Crear una reta
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(savedSectionRef.current)}
                className="app-button app-button-secondary w-full px-6 py-3 text-sm sm:w-auto sm:text-base"
              >
                Ver retas guardadas
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-[var(--line)] pb-4 pt-6 text-sm text-[var(--muted)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>6 loco organiza retas con captura simple, guardado local y tabla de poder al instante.</p>
            <Link href="/torneos" className="font-semibold text-[var(--brand-secondary)] transition hover:text-[var(--brand-primary)]">
              Ver dominio de torneos
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
