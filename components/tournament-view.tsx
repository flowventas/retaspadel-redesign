"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { MatchCard } from "@/components/match-card";
import { RankingTable } from "@/components/ranking-table";
import { RoundHistory } from "@/components/round-history";
import { ThemeToggle } from "@/components/theme-toggle";
import { exportNodeAsPng } from "@/lib/export-image";
import { defaultStore, loadStore, saveStore } from "@/lib/storage";
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
  const router = useRouter();
  const [hasLoadedStore, setHasLoadedStore] = useState(false);
  const [store, setStore] = useState<TournamentStore>(defaultStore);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isExportingRanking, setIsExportingRanking] = useState(false);
  const toastIndexRef = useRef(0);
  const mobileRankingRef = useRef<HTMLDivElement | null>(null);
  const desktopRankingRef = useRef<HTMLDivElement | null>(null);
  const currentRoundSectionRef = useRef<HTMLElement | null>(null);

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

  if (!hasLoadedStore) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--s-bg)] px-5 text-[var(--s-text)]">
        <div className="w-full max-w-[430px] border border-[var(--s-line)] bg-[var(--s-surf)] p-5">
          <p className="s-kicker text-[var(--s-lime)]">Cargando reta</p>
          <h1 className="mt-2 font-display text-[40px] uppercase leading-[0.9]">Preparando cancha.</h1>
        </div>
      </main>
    );
  }

  if (!maybeTournament) {
    return (
      <main className="min-h-screen bg-[var(--s-bg)] px-5 py-16 text-[var(--s-text)]">
        <div className="mx-auto max-w-[430px] border border-[var(--s-line)] bg-[var(--s-surf)] p-6">
          <p className="s-kicker text-[var(--s-red)]">
            Reta no encontrada
          </p>
          <h1 className="mt-3 font-display text-[40px] uppercase leading-[0.9] text-[var(--s-text)]">No pudimos cargar esta reta.</h1>
          <Link
            href="/"
            className="s-big-btn mt-6"
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
    <main className="min-h-screen bg-[var(--s-bg)] text-[var(--s-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-5 pb-10 pt-[62px] lg:max-w-7xl lg:px-8">
        {toast ? (
          <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 top-4 z-50 max-w-xs border border-[var(--s-lime)] bg-[var(--s-bg)] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--s-lime)]"
          >
            {toast}
          </div>
        ) : null}

        <header className="mb-6 flex min-w-0 flex-col gap-5">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <BrandLogo
                theme={store.theme}
                variant="compact"
                className="mb-5 block w-[112px] md:mb-6"
              />
              <div className="mb-3 flex items-center justify-between gap-3">
                <Link href="/" className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--s-lime)]">
                  ← Inicio
                </Link>
                <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--s-red)]">
                  <span className="s-live-pulse" />
                  En vivo
                </span>
              </div>
              <h1 className="break-words font-display text-[42px] uppercase leading-[0.9] tracking-[0.03em] text-[var(--s-text)] sm:text-[56px]">
                {tournament.name}
              </h1>
              <p className="mt-3 max-w-3xl break-words font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-mid)]">
                {tournament.format} jugadores, partidos a {tournament.gamesPerMatch} juegos,{" "}
                {tournament.totalRounds} rondas,{" "}
                {tournament.playMode === "ladder" ? "formato escalera" : "formato rotativo"},{" "}
                {tournament.pairingMode === "fixed" ? "parejas fijas" : "parejas rotativas"}
              </p>
              <p className="mt-3 break-words text-[12px] leading-5 text-[var(--s-mid)]">
                Jugadores: {formatPlayerList(tournament.players.map((player) => player.id), names)}
              </p>
            </div>

            <div className="flex w-full justify-end sm:w-auto">
              <ThemeToggle theme={store.theme} onToggle={handleThemeToggle} />
            </div>
          </div>

          <div className="grid grid-cols-4 border-y border-[var(--s-line)]">
            {[
              { k: "JUG", v: `${tournament.format}` },
              { k: "JUEGOS", v: `${tournament.gamesPerMatch}` },
              { k: "PAREJAS", v: tournament.pairingMode === "fixed" ? "FIJ" : "ROT" },
              { k: "FORMATO", v: tournament.playMode === "ladder" ? "ESC" : "ROT" },
            ].map((item, index) => (
              <div key={item.k} className={`px-3 py-2.5 ${index < 3 ? "border-r border-[var(--s-line)]" : ""}`}>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--s-dim)]">{item.k}</p>
                <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--s-text)]">{item.v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-end gap-4">
            <div>
              <p className="s-kicker">Ronda actual</p>
              <p className="mt-1 font-display text-[96px] italic leading-[0.85] tracking-[-0.04em] text-[var(--s-lime)]">
                {currentRound ? String(currentRound.number).padStart(2, "0") : "—"}
                <span className="ml-1 text-[48px] not-italic text-[var(--s-dim)]">/{String(tournament.totalRounds).padStart(2, "0")}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="s-kicker justify-end">Lider</p>
              <p className="mt-2 break-words font-display text-[28px] uppercase leading-none text-[var(--s-text)]">{ranking[0]?.name ?? "-"}</p>
              <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--s-lime)]">
                {ranking[0]?.points ?? 0} PTS · DIF {ranking[0] && ranking[0].gameDiff >= 0 ? "+" : ""}{ranking[0]?.gameDiff ?? 0}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 border-t border-[var(--s-line)]">
            <div className="border-r border-[var(--s-line)] py-3 text-center">
              <p className="font-display text-[26px] italic leading-none text-[var(--s-text)]">{currentRound?.matches.length ?? 0}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--s-mid)]">Canchas</p>
            </div>
            <div className="border-r border-[var(--s-line)] py-3 text-center">
              <p className="font-display text-[26px] italic leading-none text-[var(--s-text)]">{progress.percentage}%</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--s-mid)]">Avance</p>
            </div>
            <div className="py-3 text-center">
              <p className="font-display text-[26px] italic leading-none text-[var(--s-lime)]">{progress.completed}</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--s-mid)]">Guardadas</p>
            </div>
          </div>
        </header>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="grid min-w-0 content-start gap-6">
            {tournament.completed ? (
              <section className="grid gap-6 border border-[var(--s-line)] bg-[var(--s-surf)] p-5">
                <div>
                  <p className="s-kicker text-[var(--s-lime)]">
                    Reta finalizada
                  </p>
                  <h2 className="mt-2 font-display text-[36px] uppercase leading-[0.9] text-[var(--s-text)]">Tabla de poder final y estadisticas</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {stats.map((player, index) => (
                    <article
                      key={player.playerId}
                      className={`border p-5 ${
                        index === 0 ? "border-[var(--s-lime)] bg-[rgba(212,255,78,0.06)]" : "border-[var(--s-line)] bg-[var(--s-bg)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-display text-[24px] uppercase leading-none text-[var(--s-text)]">{player.name}</p>
                          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--s-mid)]">
                            {player.wins} ganados - {player.draws} empates - {player.losses} perdidos
                          </p>
                        </div>
                        <span className="border border-[var(--s-line-hi)] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--s-mid)]">
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
                className="grid gap-4 border border-[var(--s-line)] bg-[var(--s-surf)] p-3 min-[541px]:gap-5 min-[541px]:p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <p className="s-kicker text-[var(--s-red)]">
                      En juego
                    </p>
                    <h2 className="mt-2 break-words font-display text-[34px] uppercase leading-none text-[var(--s-text)]">
                      {roundLabel(currentRound)}
                    </h2>
                    <p className="mt-2 break-words text-[12px] leading-5 text-[var(--s-mid)]">
                      Usa los botones para marcar juegos. Cada partido siempre suma {tournament.gamesPerMatch}.
                    </p>
                  </div>
                </div>

                {error ? (
                  <div className="border border-[var(--s-red)] bg-[rgba(255,61,77,0.08)] px-4 py-3 text-[12px] font-semibold text-[var(--s-red)]" role="alert">
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

                <button type="button" onClick={handleSaveRound} className="s-big-btn">
                  Guardar ronda ▸
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
                  className="app-button app-button-secondary w-full px-4 py-3 text-[18px] disabled:cursor-wait"
                >
                  {isExportingRanking ? "Preparando PNG..." : "Descargar tabla de poder en PNG"}
                </button>
              ) : null}
            </div>

            <section className="motion-card motion-delay-2 grid min-w-0 gap-4">
              <div>
                <p className="s-section-label"><span>02 · </span>Historial</p>
                <h2 className="mt-2 font-display text-[30px] uppercase leading-none text-[var(--s-text)]">Rondas anteriores</h2>
              </div>
              <RoundHistory
                rounds={orderedFinishedRounds}
                names={names}
                onEdit={handleEditRound}
                editableRoundId={editableHistoryRoundId}
              />
            </section>

            <section className="grid gap-3 border border-[var(--s-line)] bg-[var(--s-surf)] p-4 sm:p-5">
              <div>
                <p className="s-section-label"><span>03 · </span>Acciones</p>
                <h2 className="mt-2 font-display text-[26px] uppercase leading-none text-[var(--s-text)]">Opciones de la reta</h2>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleFinishTournament}
                  disabled={tournament.completed}
                  className="app-button app-button-secondary w-full px-4 py-3 text-[18px] disabled:cursor-default sm:w-auto"
                >
                  {tournament.completed ? "Reta finalizada" : "Terminar reta"}
                </button>
                <button type="button" onClick={handleDeleteTournament} className="app-button app-button-danger w-full px-4 py-3 text-[18px] sm:w-auto">
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
                  className="app-button app-button-secondary w-full px-4 py-3 text-[18px] disabled:cursor-wait"
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
