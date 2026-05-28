"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { sampleNames } from "@/lib/sample";
import { parseWhatsAppPlayers } from "@/lib/whatsapp-parser";
import { GamesPerMatch, PairingMode, PlayMode, TournamentFormat } from "@/lib/types";

type NewTournamentFormProps = {
  onCreate: (payload: {
    name: string;
    format: TournamentFormat;
    gamesPerMatch: GamesPerMatch;
    pairingMode: PairingMode;
    playMode: PlayMode;
    names: string[];
  }) => void;
  savedPlayers: string[];
  onClearSavedPlayers: () => void;
  onRemoveSavedPlayer: (name: string) => void;
};

const PLAYER_OPTIONS: TournamentFormat[] = [8, 12, 16, 20];
const GAME_OPTIONS: GamesPerMatch[] = [5, 6];
const PAIRING_MODE_OPTIONS: { value: PairingMode; label: string; description: string }[] = [
  { value: "rotating", label: "Parejas rotativas", description: "Las parejas cambian en cada ronda." },
  { value: "fixed", label: "Parejas fijas", description: "Se respetan las parejas 1-2, 3-4, 5-6..." },
];

function buildTournamentName(format: TournamentFormat, gamesPerMatch: GamesPerMatch) {
  return `Reta ${format} jugadores - a ${gamesPerMatch} juegos`;
}

export function NewTournamentForm({
  onCreate,
  savedPlayers,
  onClearSavedPlayers,
  onRemoveSavedPlayer,
}: NewTournamentFormProps) {
  const [format, setFormat] = useState<TournamentFormat>(8);
  const [gamesPerMatch, setGamesPerMatch] = useState<GamesPerMatch>(6);
  const [pairingMode, setPairingMode] = useState<PairingMode>("rotating");
  const [playMode, setPlayMode] = useState<PlayMode>("standard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlayModeModalOpen, setIsPlayModeModalOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [names, setNames] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
  const [importedNames, setImportedNames] = useState<string[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[] | null>(null);
  const canUsePortal = typeof window !== "undefined";

  const progress = useMemo(() => `${Math.min(currentIndex + 1, format)}/${format}`, [currentIndex, format]);
  const suggestedPlayers = useMemo(() => {
    const usedNames = new Set(
      names
        .filter((_, index) => index !== currentIndex)
        .map((item) => item.trim().toLocaleLowerCase())
        .filter(Boolean),
    );
    const query = draftName.trim().toLocaleLowerCase();

    return savedPlayers
      .filter((name) => {
        const normalized = name.trim().toLocaleLowerCase();
        if (!normalized || usedNames.has(normalized)) {
          return false;
        }

        return query ? normalized.includes(query) : true;
      })
      .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }));
  }, [currentIndex, draftName, names, savedPlayers]);

  function openPlayerModal(initialNames?: string[]) {
    const baseNames = Array.from({ length: format }, (_, index) => initialNames?.[index] ?? "");
    setNames(baseNames);
    setCurrentIndex(0);
    setDraftName(baseNames[0] ?? "");
    setError("");
    setIsRecentOpen(false);
    setIsModalOpen(true);
  }

  function completeStartFlow(initialNames?: string[], nextPlayMode: PlayMode = playMode) {
    setPlayMode(nextPlayMode);
    const nextGamesPerMatch = nextPlayMode === "ladder" ? 5 : gamesPerMatch;
    if (nextPlayMode === "ladder") {
      setGamesPerMatch(5);
    }

    if (initialNames?.length === format) {
      onCreate({
        name: buildTournamentName(format, nextGamesPerMatch),
        format,
        gamesPerMatch: nextGamesPerMatch,
        pairingMode,
        playMode: nextPlayMode,
        names: initialNames,
      });
      setWhatsAppMessage("");
      setImportedNames([]);
      setImportMessage("");
      setImportError("");
      return;
    }

    openPlayerModal(initialNames);
  }

  function beginStartFlow(initialNames?: string[]) {
    if (format >= 12) {
      setPendingNames(initialNames ?? null);

      const openPlayModeModal = () => setIsPlayModeModalOpen(true);

      if (typeof window !== "undefined") {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
        window.setTimeout(openPlayModeModal, 320);
      } else {
        openPlayModeModal();
      }

      return;
    }

    completeStartFlow(initialNames, "standard");
  }

  function closePlayerModal() {
    setIsModalOpen(false);
    setIsRecentOpen(false);
    setCurrentIndex(0);
    setDraftName("");
    setError("");
  }

  function handleFormatChange(nextFormat: TournamentFormat) {
    setFormat(nextFormat);
    setError("");
    setImportedNames((current) => current.slice(0, nextFormat));
    setImportMessage("");
    setImportError("");
  }

  function handleNextPlayer() {
    const trimmedName = draftName.trim();
    const currentNames = [...names];
    const duplicate = currentNames.some(
      (item, index) => index !== currentIndex && item.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (!trimmedName) {
      setError("Escribe un nombre antes de continuar.");
      return;
    }

    if (duplicate) {
      setError("Ese nombre ya fue capturado. Usa uno distinto.");
      return;
    }

    currentNames[currentIndex] = trimmedName;
    setNames(currentNames);
    setError("");

    if (currentIndex === format - 1) {
      onCreate({
        name: buildTournamentName(format, gamesPerMatch),
        format,
        gamesPerMatch,
        pairingMode,
        playMode,
        names: currentNames,
      });
      closePlayerModal();
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setDraftName(currentNames[nextIndex] ?? "");
    setIsRecentOpen(false);
  }

  function handlePickSuggestedPlayer(name: string) {
    setDraftName(name);
    setError("");
    setIsRecentOpen(false);
  }

  function handleClearRecentPlayers() {
    onClearSavedPlayers();
    setIsRecentOpen(false);
  }

  function handleUseDemo() {
    beginStartFlow(sampleNames(format));
  }

  function handleImportWhatsAppMessage() {
    const parsed = parseWhatsAppPlayers(whatsAppMessage);
    const detectedFormat = PLAYER_OPTIONS.find((option) => option === parsed.totalDetected);
    const effectiveFormat = detectedFormat ?? format;

    if (!parsed.totalDetected) {
      setImportedNames([]);
      setImportError("No encontramos jugadores en ese mensaje.");
      setImportMessage("");
      return;
    }

    if (detectedFormat) {
      setFormat(detectedFormat);
    }

    setPairingMode(parsed.pairingMode);
    setImportedNames(detectedFormat ? parsed.names.slice(0, detectedFormat) : parsed.names);
    setImportError("");

    if (!detectedFormat) {
      setImportMessage(
        `Detectamos ${parsed.totalDetected} jugadores antes de la lista de espera, pero solo manejamos retas de 8, 12, 16 o 20.`,
      );
      return;
    }

    if (parsed.totalDetected < effectiveFormat) {
      setImportMessage(
        `Detectamos ${parsed.totalDetected} jugadores antes de la lista de espera. Faltan ${effectiveFormat - parsed.totalDetected} por completar.`,
      );
      return;
    }

    if (parsed.totalDetected > effectiveFormat) {
      setImportMessage(
        `Ajustamos la reta a ${parsed.totalDetected} jugadores segun el mensaje detectado${parsed.pairingMode === "fixed" ? " y marcamos parejas fijas." : "."}`,
      );
      return;
    }

    setImportMessage(
      `Detectamos y ajustamos la reta a ${detectedFormat} jugadores${parsed.pairingMode === "fixed" ? " con parejas fijas." : "."}`,
    );
  }

  function handleUseImportedPlayers() {
    if (!importedNames.length) {
      return;
    }
    beginStartFlow(importedNames);
  }

  function handleImportedNameChange(index: number, value: string) {
    setImportedNames((current) => current.map((name, itemIndex) => (itemIndex === index ? value : name)));
  }

  function handleClearImportedPlayers() {
    setImportedNames([]);
    setImportMessage("");
    setImportError("");
  }

  return (
    <>
      <section className="app-card grid gap-6 p-6 md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
              Nueva reta
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--app-text)]">
              Configura la reta y prende la competencia
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
              Elige jugadores, define si van a 5 o 6 juegos y arranca sin complicarte.
            </p>
          </div>
          <button type="button" onClick={handleUseDemo} className="app-button app-button-primary px-4 py-2 text-sm">
            Probar demo
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-[var(--app-text)]">
            Numero de jugadores
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-subtle)] p-1">
              {PLAYER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleFormatChange(option)}
                  className={`rounded-[1rem] px-4 py-3 text-sm font-bold transition ${
                    format === option
                      ? "bg-[var(--brand-secondary)] text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium text-[var(--app-text)]">
            Juegos por partido
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-subtle)] p-1">
              {GAME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGamesPerMatch(option)}
                  disabled={playMode === "ladder" && option === 6}
                  className={`rounded-[1rem] px-4 py-3 text-sm font-bold transition ${
                    gamesPerMatch === option
                      ? "bg-[var(--brand-secondary)] text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                  } ${playMode === "ladder" && option === 6 ? "cursor-not-allowed opacity-45 hover:bg-transparent" : ""}`}
                >
                  Reta a {option}
                </button>
              ))}
            </div>
            {playMode === "ladder" ? (
              <p className="text-xs text-[var(--muted)]">En formato escalera la reta siempre se juega a 5 juegos.</p>
            ) : null}
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-[var(--app-text)]">
          Modalidad de parejas
          <div className="grid gap-2 rounded-2xl bg-[var(--surface-subtle)] p-1 md:grid-cols-2">
            {PAIRING_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPairingMode(option.value)}
                className={`grid gap-1 rounded-[1rem] px-4 py-3 text-left transition ${
                  pairingMode === option.value
                    ? "bg-[var(--brand-secondary)] text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-strong)]"
                }`}
              >
                <span className="text-sm font-bold">{option.label}</span>
                <span className={`text-xs ${pairingMode === option.value ? "text-white/85" : "text-[var(--muted)]"}`}>
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </label>

        <div className="grid gap-3 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
          <button
            type="button"
            onClick={() => setIsWhatsAppOpen((current) => !current)}
            aria-expanded={isWhatsAppOpen}
            aria-controls="whatsapp-import-panel"
            className="flex items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="text-sm font-semibold text-[var(--app-text)]">Importar desde WhatsApp</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Pega una reta ya armada y extraemos los nombres automaticamente.
              </p>
            </div>
            <span className="text-lg font-black text-[var(--brand-secondary)]" aria-hidden="true">
              {isWhatsAppOpen ? "-" : "+"}
            </span>
          </button>

          <div id="whatsapp-import-panel" className="accordion-panel" data-open={isWhatsAppOpen}>
            <div className="accordion-panel-inner">
              <textarea
                value={whatsAppMessage}
                onChange={(event) => setWhatsAppMessage(event.target.value)}
                rows={7}
                placeholder="Pega aqui el mensaje completo de la reta..."
                className="app-input w-full px-4 py-4 text-sm"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleImportWhatsAppMessage}
                  className="app-button app-button-secondary px-4 py-3 text-sm"
                >
                  Extraer jugadores
                </button>

                {importMessage ? (
                  <p className="text-sm text-[var(--muted)]" aria-live="polite">
                    {importMessage}
                  </p>
                ) : null}
              </div>

              {importError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                  {importError}
                </div>
              ) : null}

              {importedNames.length ? (
                <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--app-text)]">Jugadores detectados</p>
                    <p className="text-sm text-[var(--muted)]">
                      {importedNames.length} de {format} listos para usar
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {importedNames.map((name, index) => (
                      <label
                        key={`imported-player-${index + 1}`}
                        className="grid gap-1 rounded-xl bg-[var(--surface-subtle)] px-3 py-2"
                      >
                        <span className="text-xs font-bold text-[var(--muted)]">{index + 1}.</span>
                        <input
                          value={name}
                          onChange={(event) => handleImportedNameChange(index, event.target.value)}
                          className="min-w-0 bg-transparent text-sm font-semibold text-[var(--app-text)] outline-none"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleClearImportedPlayers}
                      className="app-button app-button-danger px-3 py-2 text-xs"
                    >
                      Vaciar lista
                    </button>
                    <button
                      type="button"
                      onClick={handleUseImportedPlayers}
                      className="app-button app-button-primary px-4 py-3 text-sm"
                    >
                      {importedNames.length === format ? "Arrancar con estos jugadores" : "Completar jugadores detectados"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">Resumen</p>
            <p className="text-2xl font-black text-[var(--app-text)]">
              {format} jugadores - {gamesPerMatch} juegos
            </p>
          </div>
          <p className="max-w-sm text-right text-sm text-[var(--muted)]">
            {pairingMode === "fixed"
              ? "En parejas fijas, el orden de captura define las parejas: 1-2, 3-4, 5-6..."
              : "Al iniciar, la app te ira pidiendo un nombre por jugador en popups consecutivos."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => beginStartFlow()}
          className="app-button app-button-primary px-6 py-4 text-base"
        >
          Iniciar reta
        </button>
      </section>

      {canUsePortal && isPlayModeModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4">
              <div className="w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.24)]">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                  Formato de reta
                </p>
                <h3 className="mt-2 text-3xl font-black text-[var(--app-text)]">Como quieres jugar esta reta?</h3>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  La modalidad de parejas que elegiste se respetara dentro del formato.
                </p>

                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayModeModalOpen(false);
                      completeStartFlow(pendingNames ?? undefined, "standard");
                      setPendingNames(null);
                    }}
                    className="grid gap-1 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 text-left transition hover:border-[var(--brand-primary)]"
                  >
                    <span className="text-base font-black text-[var(--app-text)]">Rotativo</span>
                    <span className="text-sm text-[var(--muted)]">La app rota rondas como hasta ahora.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayModeModalOpen(false);
                      completeStartFlow(pendingNames ?? undefined, "ladder");
                      setPendingNames(null);
                    }}
                    className="grid gap-1 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4 text-left transition hover:border-[var(--brand-primary)]"
                  >
                    <span className="text-base font-black text-[var(--app-text)]">Escalera</span>
                    <span className="text-sm text-[var(--muted)]">
                      Los jugadores o parejas suben y bajan de cancha segun resultados.
                    </span>
                  </button>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayModeModalOpen(false);
                      setPendingNames(null);
                    }}
                    className="app-button app-button-secondary px-4 py-3 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {canUsePortal && isModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4">
              <div className="w-full max-w-md rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.24)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
                      Jugador {currentIndex + 1}
                    </p>
                    <h3 className="mt-2 text-3xl font-black text-[var(--app-text)]">Captura el nombre</h3>
                  </div>
                  <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-sm font-bold text-[var(--muted)]">
                    {progress}
                  </span>
                </div>

                <label className="mt-6 grid gap-2 text-sm font-medium text-[var(--app-text)]">
                  Nombre del jugador
                  <input
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    autoFocus
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleNextPlayer();
                      }
                    }}
                    className="app-input px-4 py-4 text-lg"
                    placeholder={`Jugador ${currentIndex + 1}`}
                  />
                </label>

                {savedPlayers.length ? (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecentOpen((current) => !current)}
                      aria-expanded={isRecentOpen}
                      className="inline-flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-left text-sm font-semibold text-[var(--app-text)] transition hover:border-[var(--brand-primary)]"
                    >
                      <span>Jugadores recientes</span>
                      <span aria-hidden="true" className="text-base">
                        {isRecentOpen ? "^" : "v"}
                      </span>
                    </button>

                    {isRecentOpen ? (
                      <div className="grid max-h-64 gap-2 overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] p-3">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                            Guardados
                          </p>
                          <button
                            type="button"
                            onClick={handleClearRecentPlayers}
                            className="text-xs font-bold text-[var(--danger-text)] transition hover:opacity-80"
                          >
                            Borrar lista
                          </button>
                        </div>

                        {suggestedPlayers.map((name) => (
                          <div
                            key={name}
                            className="flex items-center gap-2 rounded-xl transition hover:bg-[var(--surface-subtle)]"
                          >
                            <button
                              type="button"
                              onClick={() => handlePickSuggestedPlayer(name)}
                              className="min-w-0 flex-1 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--app-text)] transition hover:text-[var(--brand-secondary)]"
                            >
                              {name}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveSavedPlayer(name)}
                              aria-label={`Borrar ${name}`}
                              title={`Borrar ${name}`}
                              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold text-[var(--danger-text)] transition hover:bg-[var(--danger-bg)]"
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closePlayerModal}
                    className="app-button app-button-secondary px-4 py-3 text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPlayer}
                    className="app-button app-button-primary px-5 py-3 text-sm"
                  >
                    {currentIndex === format - 1 ? "Generar reta" : "Siguiente jugador"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
