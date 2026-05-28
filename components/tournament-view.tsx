"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MatchCard } from "@/components/match-card";
import { RankingTable } from "@/components/ranking-table";
import { RoundHistory } from "@/components/round-history";
import { ThemeToggle } from "@/components/theme-toggle";
import { exportNodeAsPng } from "@/lib/export-image";
import { loadStore, saveStore } from "@/lib/storage";
import {
  calculateRanking,
  createLinkedScore,
  finishTournament,
  formatPlayerList,
  getCurrentRound,
  getPlayerStats,
  isRoundReady,
  playerNameMap,
  reopenRound,
  roundLabel,
  saveRound,
  tournamentProgress,
  updateMatchScore,
} from "@/lib/tournament";
import { Tournament, TournamentStore } from "@/lib/types";

type TournamentViewProps = {
  tournamentId: string;
};

export function TournamentView({ tournamentId }: TournamentViewProps) {
  const scoreSavedMessages = [
    "Score guardado. El ranking se movio.",
    "La cancha hablo.",
    "Alguien subio... alguien cayo.",
    "Nueva ronda, nueva oportunidad.",
  ];
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const router = useRouter();
  const [store, setStore] = useState<TournamentStore>(() => loadStore());
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isExportingRanking, setIsExportingRanking] = useState(false);
  const toastIndexRef = useRef(0);
  const mobileRankingRef = useRef<HTMLDivElement | null>(null);
  const desktopRankingRef = useRef<HTMLDivElement | null>(null);
  const currentRoundSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    saveStore(store);
    document.documentElement.classList.toggle("dark", store.theme === "dark");
  }, [isClient, store]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const maybeTournament = useMemo(
    () => store.tournaments.find((item) => item.id === tournamentId) ?? null,
    [store.tournaments, tournamentId],
  );

  if (!isClient) {
    return <main className="min-h-screen bg-[var(--app-bg)]" />;
  }

  if (!maybeTournament) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-10 text-[var(--app-text)]">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.4)]">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
            Reta no encontrada
          </p>
          <h1 className="mt-3 text-3xl font-black text-[var(--app-text)]">No pudimos cargar esta reta.</h1>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const tournament = maybeTournament;
  const ranking = calculateRanking(tournament);
  const stats = getPlayerStats(tournament);
  const currentRound = getCurrentRound(tournament);
  const names = playerNameMap(tournament.players);
  const progress = tournamentProgress(tournament);
  const finishedRounds = tournament.rounds.filter((round) => round.status === "completed");
  const orderedFinishedRounds = [...finishedRounds].sort((left, right) => right.number - left.number);
  const editableHistoryRoundId = tournament.playMode === "ladder" ? orderedFinishedRounds[0]?.id : undefined;

  function updateStore(updater: (current: TournamentStore) => TournamentStore) {
    setStore((current) => updater(current));
  }

  function persistTournament(nextTournament: Tournament) {
    updateStore((current) => ({
      ...current,
      tournaments: current.tournaments.map((item) => (item.id === nextTournament.id ? nextTournament : item)),
      activeTournamentId: nextTournament.id,
    }));
  }

  function handleAdjustScore(matchId: string, delta: -1 | 1) {
    if (!currentRound) {
      return;
    }

    const match = currentRound.matches.find((item) => item.id === matchId);
    if (!match) {
      return;
    }

    if (match.score === null && delta === -1) {
      return;
    }

    if (match.score === null && delta === 1) {
      persistTournament(
        updateMatchScore(
          tournament,
          currentRound.id,
          matchId,
          createLinkedScore(0, tournament.gamesPerMatch),
        ),
      );
      setError("");
      return;
    }

    const currentTeamA = match.score?.teamA ?? 0;
    const nextTeamA = currentTeamA + delta;
    if (nextTeamA < 0 || nextTeamA > tournament.gamesPerMatch) {
      return;
    }

    persistTournament(
      updateMatchScore(
        tournament,
        currentRound.id,
        matchId,
        createLinkedScore(nextTeamA, tournament.gamesPerMatch),
      ),
    );
    setError("");
  }

  function handleSaveRound() {
    if (!currentRound) {
      return;
    }

    if (
      tournament.playMode === "ladder" &&
      currentRound.matches.some((match) => match.score && match.score.teamA === match.score.teamB)
    ) {
      setError("En formato escalera no puede haber empate, porque siempre debe subir y bajar alguien.");
      return;
    }

    if (!isRoundReady(currentRound, tournament.gamesPerMatch)) {
      setError("Completa y valida todos los scores antes de guardar.");
      return;
    }

    persistTournament(saveRound(tournament, currentRound.id));
    setError("");
    setToast(scoreSavedMessages[toastIndexRef.current % scoreSavedMessages.length]);
    toastIndexRef.current += 1;
    window.requestAnimationFrame(() => {
      currentRoundSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleEditRound(roundId: string) {
    persistTournament(reopenRound(tournament, roundId));
    setError("");
    window.requestAnimationFrame(() => {
      currentRoundSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleDeleteTournament() {
    if (!window.confirm(`Borrar la reta "${tournament.name}"?`)) {
      return;
    }

    updateStore((current) => {
      const remaining = current.tournaments.filter((item) => item.id !== tournament.id);
      return {
        ...current,
        tournaments: remaining,
        activeTournamentId: remaining[0]?.id ?? null,
      };
    });
    router.push("/");
  }

  function handleFinishTournament() {
    if (tournament.completed) {
      return;
    }

    if (!window.confirm("Terminar reta ahora? La tabla de poder actual quedara como final.")) {
      return;
    }

    persistTournament(finishTournament(tournament));
    setError("");
    setToast("Reta cerrada. La tabla de poder actual ya es la final.");
  }

  function handleThemeToggle() {
    updateStore((current) => ({
      ...current,
      theme: current.theme === "dark" ? "light" : "dark",
    }));
  }

  async function handleDownloadFinalRanking() {
    if (isExportingRanking) {
      return;
    }

    const exportTarget =
      (desktopRankingRef.current && desktopRankingRef.current.offsetParent !== null
        ? desktopRankingRef.current
        : null) ??
      (mobileRankingRef.current && mobileRankingRef.current.offsetParent !== null
        ? mobileRankingRef.current
        : null);

    if (!exportTarget) {
      setToast("No encontramos la tabla de poder para descargar.");
      return;
    }

    try {
      setIsExportingRanking(true);
      await exportNodeAsPng(
        exportTarget,
        `${tournament.name.toLowerCase().replaceAll(" ", "-")}-tabla-de-poder.png`,
      );
      setToast("Tabla de poder descargada. Lista para compartir.");
    } catch (downloadError) {
      setToast(
        downloadError instanceof Error
          ? downloadError.message
          : "No pudimos descargar la tabla de poder.",
      );
    } finally {
      setIsExportingRanking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] transition-colors">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,_color-mix(in_srgb,var(--brand-accent)_10%,transparent),_transparent_46%),radial-gradient(circle_at_right,_color-mix(in_srgb,var(--brand-primary)_6%,transparent),_transparent_36%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {toast ? (
          <div
            aria-live="polite"
            className="motion-toast pointer-events-none fixed right-4 top-4 z-50 max-w-xs rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm font-bold text-[var(--app-text)] shadow-[0_16px_34px_-26px_rgba(15,23,42,0.26)]"
          >
            {toast}
          </div>
        ) : null}

        <header className="app-hero motion-hero mb-6 flex min-w-0 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <BrandLogo
                theme={store.theme}
                variant="compact"
                className="mb-4 block max-[499px]:mx-auto min-[500px]:ml-auto md:mb-5"
              />
              <Link href="/" className="inline-flex text-sm font-bold uppercase tracking-[0.25em] text-[var(--brand-accent)]">
                Volver al inicio
              </Link>
              <h1 className="mt-3 break-words text-2xl font-black tracking-tight min-[541px]:text-3xl sm:text-4xl">
                {tournament.name}
              </h1>
              <p className="mt-2 max-w-3xl break-words text-sm text-[var(--hero-muted)] md:text-base">
                {tournament.format} jugadores, partidos a {tournament.gamesPerMatch} juegos,{" "}
                {tournament.totalRounds} rondas,{" "}
                {tournament.playMode === "ladder" ? "formato escalera" : "formato rotativo"},{" "}
                {tournament.pairingMode === "fixed" ? "parejas fijas" : "parejas rotativas"}
              </p>
              <p className="mt-3 break-words text-sm text-[var(--hero-muted)]">
                Jugadores: {formatPlayerList(tournament.players.map((player) => player.id), names)}
              </p>
            </div>

            <div className="flex w-full justify-end sm:w-auto">
              <ThemeToggle theme={store.theme} onToggle={handleThemeToggle} />
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 min-[541px]:gap-3 md:grid-cols-4">
            <div className="rounded-[1.25rem] bg-white/10 px-3 py-3 min-[541px]:rounded-[1.5rem] min-[541px]:px-4 min-[541px]:py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Ronda actual</p>
              <p className="mt-2 break-words text-lg font-black min-[541px]:text-xl sm:text-2xl">
                {currentRound ? roundLabel(currentRound) : "Sin ronda"}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-3 py-3 min-[541px]:rounded-[1.5rem] min-[541px]:px-4 min-[541px]:py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Canchas</p>
              <p className="mt-2 break-words text-lg font-black min-[541px]:text-xl sm:text-2xl">
                {currentRound?.matches.length ?? 0}
              </p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-3 py-3 min-[541px]:rounded-[1.5rem] min-[541px]:px-4 min-[541px]:py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Avance</p>
              <p className="mt-2 break-words text-lg font-black min-[541px]:text-xl sm:text-2xl">{progress.percentage}%</p>
            </div>
            <div className="rounded-[1.25rem] bg-white/10 px-3 py-3 min-[541px]:rounded-[1.5rem] min-[541px]:px-4 min-[541px]:py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--hero-muted)]">Lider</p>
              <p className="mt-2 break-words text-lg font-black min-[541px]:text-xl sm:text-2xl">{ranking[0]?.name ?? "-"}</p>
            </div>
          </div>
        </header>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid min-w-0 content-start gap-6">
            {tournament.completed ? (
              <section className="app-card motion-card motion-delay-1 grid gap-6 p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                    Reta finalizada
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[var(--app-text)]">Tabla de poder final y estadisticas</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {stats.map((player, index) => (
                    <article
                      key={player.playerId}
                      className={`rounded-[1.75rem] border p-5 ${
                        index === 0 ? "border-[var(--brand-accent)] bg-[var(--brand-accent-soft)]" : "border-[var(--line)] bg-[var(--surface-subtle)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-black text-[var(--app-text)]">{player.name}</p>
                          <p className="text-sm text-[var(--muted)]">
                            {player.wins} ganados - {player.draws} empates - {player.losses} perdidos
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                          {index === 0 ? "Lider de la reta" : `#${index + 1}`}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : currentRound ? (
              <section
                ref={currentRoundSectionRef}
                className="app-card motion-card motion-delay-1 grid gap-4 p-3 min-[541px]:gap-6 min-[541px]:p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                      En juego
                    </p>
                    <h2 className="mt-2 break-words text-2xl font-black text-[var(--app-text)] min-[541px]:text-3xl">
                      {roundLabel(currentRound)}
                    </h2>
                    <p className="mt-2 break-words text-sm text-[var(--muted)]">
                      Usa los botones para marcar juegos. Cada partido siempre suma {tournament.gamesPerMatch}.
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  {currentRound.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      names={names}
                      gamesPerMatch={tournament.gamesPerMatch}
                      onAdjustScore={handleAdjustScore}
                    />
                  ))}
                </div>

                <button type="button" onClick={handleSaveRound} className="app-button app-button-primary w-full px-4 py-3 text-sm">
                  Guardar score
                </button>
              </section>
            ) : null}

            <div className="grid gap-3 lg:hidden">
              <div ref={mobileRankingRef}>
                <RankingTable rows={ranking} />
              </div>
              {tournament.completed ? (
                <button
                  type="button"
                  onClick={handleDownloadFinalRanking}
                  disabled={isExportingRanking}
                  className="app-button app-button-secondary w-full px-4 py-3 text-sm disabled:cursor-wait"
                >
                  {isExportingRanking ? "Preparando PNG..." : "Descargar tabla de poder en PNG"}
                </button>
              ) : null}
            </div>

            <section className="motion-card motion-delay-2 grid min-w-0 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">Historial</p>
                <h2 className="mt-2 text-2xl font-black text-[var(--app-text)]">Rondas anteriores</h2>
              </div>
              <RoundHistory
                rounds={orderedFinishedRounds}
                names={names}
                onEdit={handleEditRound}
                editableRoundId={editableHistoryRoundId}
              />
            </section>

            <section className="app-card motion-card motion-delay-3 grid gap-3 p-4 sm:p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">Acciones</p>
                <h2 className="mt-2 text-xl font-black text-[var(--app-text)]">Opciones de la reta</h2>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleFinishTournament}
                  disabled={tournament.completed}
                  className="app-button app-button-secondary w-full px-4 py-3 text-sm disabled:cursor-default sm:w-auto"
                >
                  {tournament.completed ? "Reta finalizada" : "Terminar reta"}
                </button>
                <button type="button" onClick={handleDeleteTournament} className="app-button app-button-danger w-full px-4 py-3 text-sm sm:w-auto">
                  Borrar reta
                </button>
              </div>
            </section>
          </div>

          <div className="motion-card motion-delay-2 hidden min-w-0 content-start gap-3 lg:grid">
            <div ref={desktopRankingRef}>
              <RankingTable rows={ranking} />
            </div>
            {tournament.completed ? (
              <button
                type="button"
                onClick={handleDownloadFinalRanking}
                disabled={isExportingRanking}
                className="app-button app-button-secondary w-full px-4 py-3 text-sm disabled:cursor-wait"
              >
                {isExportingRanking ? "Preparando PNG..." : "Descargar tabla de poder en PNG"}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
