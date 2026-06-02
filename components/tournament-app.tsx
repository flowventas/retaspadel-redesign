"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { NewTournamentForm } from "@/components/new-tournament-form";
import { defaultStore, loadStore, saveStore } from "@/lib/storage";
import { createPlayers, createTournament } from "@/lib/tournament";
import { GamesPerMatch, PairingMode, PlayMode, Tournament, TournamentFormat, TournamentStore } from "@/lib/types";

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

function formatTournamentConfig(tournament: Tournament) {
  const mode = tournament.playMode === "ladder" ? "ESC" : "ROT";
  const pairing = tournament.pairingMode === "fixed" ? "FIJ" : "ROT";

  return `${tournament.format} JUG · ${tournament.gamesPerMatch} JUEGOS · ${pairing} · ${mode}`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function playerInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
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
    document.documentElement.classList.add("dark");
  }, [hasLoadedStore, store]);

  function handleCreateTournament(payload: {
    name: string;
    format: TournamentFormat;
    gamesPerMatch: GamesPerMatch;
    pairingMode: PairingMode;
    playMode: PlayMode;
    startingCourt: number;
    names: string[];
  }) {
    const tournament = createTournament(
      payload.name,
      createPlayers(payload.names),
      payload.format,
      payload.gamesPerMatch,
      payload.pairingMode,
      payload.playMode,
      payload.startingCourt,
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
  const activeTournamentList = tournaments.filter((tournament) => !tournament.completed);
  const finishedTournamentList = tournaments.filter((tournament) => tournament.completed);
  const completedTournaments = tournaments.filter((tournament) => tournament.completed).length;
  const activeTournaments = tournaments.length - completedTournaments;

  return (
    <main className="min-h-screen bg-[var(--s-bg)] text-[var(--s-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-10 pt-[62px] lg:max-w-6xl lg:px-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.8fr)] lg:items-end">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo theme={store.theme} variant="compact" className="w-[112px] sm:w-[124px]" />
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--s-dim)]">
                v3 · local
              </span>
            </div>
          </div>

          <div className="grid gap-5 lg:col-span-2 lg:grid-cols-[minmax(0,0.95fr)_minmax(20rem,0.75fr)] lg:items-end">
            <div>
              <h1 className="mt-1 font-display text-[54px] uppercase leading-[0.88] tracking-[0.01em] text-[var(--s-text)] sm:text-[68px] lg:text-[88px]">
                Organiza
                <br />
                retas.
                <br />
                <span className="text-[var(--s-lime)]">Que mande</span>
                <br />
                <span className="italic text-[var(--s-lime)]">la tabla.</span>
              </h1>
              <p className="mt-4 max-w-[19rem] text-[13px] leading-6 text-[var(--s-mid)] sm:max-w-md">
                Configura jugadores, arma rondas y captura scores sin frenar el juego.
              </p>

              <button
                type="button"
                onClick={() => scrollToSection(formSectionRef.current)}
                className="relative mt-6 flex w-full items-center justify-between overflow-hidden bg-[var(--s-lime)] px-5 py-5 text-left text-[var(--s-bg)] lg:max-w-md"
              >
                <span className="absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(-45deg,#000_0,#000_1px,transparent_1px,transparent_10px)]" />
                <span className="relative">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">▸ nueva</span>
                  <span className="mt-1 block font-display text-[42px] uppercase leading-[0.9] tracking-[0.03em]">
                    Crear
                    <br />
                    reta.
                  </span>
                </span>
                <span className="relative font-display text-[72px] italic leading-none">+</span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection(savedSectionRef.current)}
                className="app-button app-button-secondary mt-3 w-full px-5 py-4 lg:max-w-md"
              >
                Ver retas guardadas
              </button>
            </div>

            <aside className="s-card grid gap-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="s-kicker">Marcador local</p>
                <span className="s-chip px-3 py-2">{activeTournaments} live</span>
              </div>
              <div className="grid grid-cols-3 border border-[var(--s-line)]">
                <div className="border-r border-[var(--s-line)] p-3 text-center">
                  <p className="font-display text-[34px] leading-none text-[var(--s-text)]">8-20</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--s-mid)]">jug</p>
                </div>
                <div className="border-r border-[var(--s-line)] p-3 text-center">
                  <p className="font-display text-[34px] leading-none text-[var(--s-text)]">5-6</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--s-mid)]">juegos</p>
                </div>
                <div className="p-3 text-center">
                  <p className="font-display text-[34px] leading-none text-[var(--s-lime)]">{tournaments.length}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--s-mid)]">retas</p>
                </div>
              </div>
              <p className="text-[12px] leading-5 text-[var(--s-mid)]">
                Captura simple, guardado local y clasificación visible para todo el grupo.
              </p>
            </aside>
          </div>
        </header>

        <section ref={savedSectionRef} className="mt-7 grid gap-7">
          <div className="grid gap-7 lg:grid-cols-2 lg:items-start">
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="s-section-label">
                  <span>01 · </span>En curso · continua
                </p>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--s-mid)]">
                  {activeTournamentList.length}
                </span>
              </div>

              {activeTournamentList.length ? (
                <div className="grid gap-2">
                  {activeTournamentList.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={`/torneo/${tournament.id}`}
                      className="relative overflow-hidden border border-[var(--s-lime)] bg-[var(--s-surf)] p-4 text-left"
                    >
                      <div className="absolute inset-0 opacity-[0.08] [background:linear-gradient(90deg,transparent_49%,var(--s-text)_50%,transparent_51%),linear-gradient(0deg,transparent_49%,var(--s-text)_50%,transparent_51%)] [background-size:80px_44px]" />
                      <div className="relative">
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--s-red)]">
                            <span className="s-live-pulse" />
                            En vivo
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-mid)]">
                            {formatShortDate(tournament.createdAt)}
                          </span>
                        </div>
                        <h2 className="mt-3 font-display text-[34px] uppercase leading-[0.92] tracking-[0.02em] text-[var(--s-text)]">
                          {tournament.name}
                        </h2>
                        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-mid)]">
                          {formatTournamentConfig(tournament)}
                        </p>
                        <div className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-4">
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--s-mid)]">Progreso</p>
                            <p className="mt-1 font-display text-[22px] uppercase text-[var(--s-lime)]">
                              {tournament.currentRoundIndex + 1}/{tournament.totalRounds}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--s-mid)]">Jugadores</p>
                            <p className="mt-1 font-display text-[22px] uppercase text-[var(--s-text)]">
                              {tournament.players.length}
                            </p>
                          </div>
                          <span className="font-display text-[34px] italic leading-none text-[var(--s-lime)]">›</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-[var(--s-line-hi)] p-4">
                  <p className="font-display text-[24px] uppercase leading-none text-[var(--s-text)]">
                    Aun no hay reta activa.
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-[var(--s-mid)]">
                    Crea una nueva y 6LOCO te lleva directo a capturar la ronda.
                  </p>
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="s-section-label">
                  <span>02 · </span>Historial · {finishedTournamentList.length} retas
                </p>
              </div>
              {finishedTournamentList.length ? (
                <div className="border-t border-[var(--s-line)]">
                  {finishedTournamentList.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-[var(--s-line)] py-3"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--s-lime)] font-display text-[18px] text-[var(--s-bg)]">
                        {playerInitial(tournament.name)}
                      </div>
                      <Link href={`/torneo/${tournament.id}`} className="min-w-0">
                        <p className="truncate font-display text-[22px] uppercase leading-none text-[var(--s-text)]">
                          {tournament.name}
                        </p>
                        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-mid)]">
                          {formatShortDate(tournament.createdAt)} · {formatTournamentConfig(tournament)}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteTournament(tournament.id)}
                        className="border border-[var(--s-line)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--s-red)]"
                      >
                        Borrar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-[var(--s-line)] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--s-dim)]">
                    Ninguna reta finalizada todavia.
                  </p>
                </div>
              )}
            </section>
          </div>
        </section>

        <section ref={formSectionRef} className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)] lg:items-start">
          <div>
            <div className="mb-3">
              <p className="s-section-label">
                <span>05 · </span>Nueva reta
              </p>
            </div>
            <NewTournamentForm
              onCreate={handleCreateTournament}
              savedPlayers={store.savedPlayers ?? []}
              onClearSavedPlayers={handleClearSavedPlayers}
              onRemoveSavedPlayer={handleRemoveSavedPlayer}
            />
          </div>

          <aside className="s-card hidden p-4 lg:grid lg:gap-3">
            <p className="s-kicker">Siguiente fase</p>
            <h2 className="font-display text-[30px] uppercase leading-none text-[var(--s-text)]">
              Crear reta toma el look completo en Fase 3.
            </h2>
            <p className="text-[12px] leading-5 text-[var(--s-mid)]">
              Por ahora conserva toda su interaccion original con la nueva base visual.
            </p>
          </aside>
        </section>

        <footer className="mt-8 border-t border-[var(--s-line)] py-5">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--s-mid)]">
            6LOCO · captura simple · guardado local · tabla al instante
          </p>
        </footer>
      </div>
    </main>
  );
}
