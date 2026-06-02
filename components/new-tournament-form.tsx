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
        `Ajustamos la reta a ${parsed.totalDetected} jugadores segun el mensaje detectado y respetamos tus selecciones.`,
      );
      return;
    }

    setImportMessage(
      `Detectamos y ajustamos la reta a ${detectedFormat} jugadores. Tus selecciones se mantienen.`,
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
      <section className="s-card grid gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="s-kicker text-[var(--s-lime)]">
              Step · configurar
            </p>
            <h2 className="mt-2 font-display text-[36px] uppercase leading-[0.9] tracking-[0.03em] text-[var(--s-text)]">
              Crear
              <br />
              reta.
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-5 text-[var(--s-mid)]">
              Elige jugadores, define si van a 5 o 6 juegos y arranca sin complicarte.
            </p>
          </div>
          <button type="button" onClick={handleUseDemo} className="app-button app-button-secondary px-4 py-3 text-[18px]">
            Probar demo
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="grid gap-3">
            <span className="s-section-label"><span>01 · </span>Cuantos jugadores?</span>
            <div className="grid grid-cols-4 gap-1.5 md:grid-cols-2">
              {PLAYER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleFormatChange(option)}
                  className={`border px-2 py-3 text-center ${
                    format === option
                      ? "border-[var(--s-lime)] bg-[var(--s-lime)] text-[var(--s-bg)]"
                      : "border-[var(--s-line)] bg-transparent text-[var(--s-text)]"
                  }`}
                >
                  <span className="block font-display text-[34px] leading-none">{option}</span>
                  <span className={`mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] ${format === option ? "text-[var(--s-bg)]/70" : "text-[var(--s-mid)]"}`}>
                    {option / 4} {option === 8 ? "canchas" : "canchas"}
                  </span>
                </button>
              ))}
            </div>
          </label>

          <label className="grid gap-3">
            <span className="s-section-label"><span>02 · </span>Juegos por partido</span>
            <div className="grid grid-cols-2 gap-1.5">
              {GAME_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setGamesPerMatch(option)}
                  disabled={playMode === "ladder" && option === 6}
                  className={`border px-3 py-3 text-center ${
                    gamesPerMatch === option
                      ? "border-[var(--s-lime)] bg-[var(--s-lime)] text-[var(--s-bg)]"
                      : "border-[var(--s-line)] bg-transparent text-[var(--s-text)]"
                  } ${playMode === "ladder" && option === 6 ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="block font-display text-[42px] leading-none">{option}</span>
                  <span className={`mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] ${gamesPerMatch === option ? "text-[var(--s-bg)]/70" : "text-[var(--s-mid)]"}`}>
                    juegos {playMode === "ladder" && option === 6 ? "· lock" : ""}
                  </span>
                </button>
              ))}
            </div>
            {playMode === "ladder" ? (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-amber)]">Escalera siempre se juega a 5.</p>
            ) : null}
          </label>
        </div>

        <label className="grid gap-3">
          <span className="s-section-label"><span>03 · </span>Modalidad de parejas</span>
          <div className="grid gap-1.5 md:grid-cols-2">
            {PAIRING_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPairingMode(option.value)}
                className={`grid gap-2 border px-4 py-4 text-left ${
                  pairingMode === option.value
                    ? "border-[var(--s-lime)] bg-[var(--s-surf)] text-[var(--s-text)]"
                    : "border-[var(--s-line)] bg-transparent text-[var(--s-mid)]"
                }`}
              >
                <span className={`font-display text-[22px] uppercase leading-none ${pairingMode === option.value ? "text-[var(--s-lime)]" : "text-[var(--s-text)]"}`}>
                  {option.label}
                </span>
                <span className="text-[11px] leading-4 text-[var(--s-mid)]">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </label>

        <div className="relative grid gap-3 overflow-hidden border border-[var(--s-lime)] bg-[var(--s-surf)] p-4">
          <span className="absolute inset-0 opacity-10 [background:repeating-linear-gradient(-45deg,var(--s-lime)_0,var(--s-lime)_1px,transparent_1px,transparent_10px)]" />
          <button
            type="button"
            onClick={() => setIsWhatsAppOpen((current) => !current)}
            aria-expanded={isWhatsAppOpen}
            aria-controls="whatsapp-import-panel"
            className="relative flex items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="font-display text-[24px] uppercase leading-none text-[var(--s-lime)]">Pegar de WhatsApp</p>
              <p className="mt-2 text-[11px] leading-5 text-[var(--s-mid)]">
                Pega una reta ya armada y extraemos los nombres automaticamente.
              </p>
            </div>
            <span className="font-display text-[34px] italic leading-none text-[var(--s-lime)]" aria-hidden="true">
              {isWhatsAppOpen ? "−" : "›"}
            </span>
          </button>

          <div id="whatsapp-import-panel" className="accordion-panel relative" data-open={isWhatsAppOpen}>
            <div className="accordion-panel-inner">
              <textarea
                value={whatsAppMessage}
                onChange={(event) => setWhatsAppMessage(event.target.value)}
                rows={7}
                placeholder="Pega aqui el mensaje completo de la reta..."
                className="app-input mt-3 w-full px-3 py-3 font-mono text-[12px] leading-5"
              />

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleImportWhatsAppMessage}
                  className="app-button app-button-secondary px-4 py-3 text-[18px]"
                >
                  Extraer jugadores
                </button>

                {importMessage ? (
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-mid)]" aria-live="polite">
                    {importMessage}
                  </p>
                ) : null}
              </div>

              {importError ? (
                <div className="mt-3 border border-[var(--s-red)] bg-[rgba(255,61,77,0.08)] px-4 py-3 text-[12px] font-medium text-[var(--s-red)]" role="alert">
                  {importError}
                </div>
              ) : null}

              {importedNames.length ? (
                <div className="mt-3 grid gap-3 border border-[var(--s-lime)] bg-[var(--s-surf)] p-4">
                  <div>
                    <p className="s-kicker text-[var(--s-lime)]">Detectados</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--s-mid)]">
                      {importedNames.length} de {format} listos para usar
                    </p>
                  </div>

                  <div className="grid max-h-[42vh] gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2 sm:overflow-visible sm:pr-0">
                    {importedNames.map((name, index) => (
                      <label
                        key={`imported-player-${index + 1}`}
                        className="grid grid-cols-[2.25rem_1fr] items-center gap-2 border border-[var(--s-line)] bg-[var(--s-surf-2)] px-2 py-2 sm:grid-cols-1 sm:items-start sm:px-3"
                      >
                        <span className="font-mono text-[10px] font-bold text-[var(--s-mid)]">{String(index + 1).padStart(2, "0")}</span>
                        <input
                          value={name}
                          onChange={(event) => handleImportedNameChange(index, event.target.value)}
                          className="min-w-0 bg-transparent text-[16px] font-semibold text-[var(--s-text)] outline-none sm:text-[13px]"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleClearImportedPlayers}
                      className="app-button app-button-danger w-full px-3 py-2 text-[16px] sm:w-auto"
                    >
                      Vaciar lista
                    </button>
                    <button
                      type="button"
                      onClick={handleUseImportedPlayers}
                      className="app-button app-button-primary w-full px-4 py-3 text-[18px] sm:w-auto"
                    >
                      {importedNames.length === format ? "Arrancar con estos jugadores" : "Completar jugadores detectados"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-y border-[var(--s-line)] py-4 sm:grid-cols-[1fr_1.1fr] sm:items-center">
          <div>
            <p className="s-kicker">Resumen</p>
            <p className="mt-1 font-display text-[30px] uppercase leading-none text-[var(--s-text)]">
              {format} jugadores - {gamesPerMatch} juegos
            </p>
          </div>
          <p className="text-[12px] leading-5 text-[var(--s-mid)] sm:text-right">
            {pairingMode === "fixed"
              ? "En parejas fijas, el orden de captura define las parejas: 1-2, 3-4, 5-6..."
              : "Al iniciar, la app te ira pidiendo un nombre por jugador en popups consecutivos."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => beginStartFlow()}
          className="s-big-btn"
        >
          Arrancar reta ▸
        </button>
      </section>

      {canUsePortal && isPlayModeModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/82 px-4">
              <div className="w-full max-w-md border border-[var(--s-line-hi)] bg-[var(--s-bg)] p-5">
                <p className="s-kicker text-[var(--s-lime)]">
                  Formato de reta
                </p>
                <h3 className="mt-2 font-display text-[36px] uppercase leading-[0.9] text-[var(--s-text)]">Como quieres jugar esta reta?</h3>
                <p className="mt-3 text-[12px] leading-5 text-[var(--s-mid)]">
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
                    className="grid gap-2 border border-[var(--s-line)] bg-[var(--s-surf)] px-4 py-4 text-left"
                  >
                    <span className="font-display text-[24px] uppercase leading-none text-[var(--s-lime)]">Rotativo</span>
                    <span className="text-[12px] leading-5 text-[var(--s-mid)]">La app rota rondas como hasta ahora.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPlayModeModalOpen(false);
                      completeStartFlow(pendingNames ?? undefined, "ladder");
                      setPendingNames(null);
                    }}
                    className="grid gap-2 border border-[var(--s-line)] bg-[var(--s-surf)] px-4 py-4 text-left"
                  >
                    <span className="font-display text-[24px] uppercase leading-none text-[var(--s-text)]">Escalera</span>
                    <span className="text-[12px] leading-5 text-[var(--s-mid)]">
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
                    className="app-button app-button-secondary px-4 py-3 text-[18px]"
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
            <div className="fixed inset-0 z-50 grid items-start overflow-y-auto bg-black/82 px-4 py-4 sm:place-items-center">
              <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border border-[var(--s-line-hi)] bg-[var(--s-bg)] p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="s-kicker text-[var(--s-lime)]">
                      Jugador {currentIndex + 1}
                    </p>
                    <h3 className="mt-2 font-display text-[30px] uppercase leading-[0.9] text-[var(--s-text)] sm:text-[36px]">Captura el nombre</h3>
                  </div>
                  <span className="s-chip px-3 py-2">
                    {progress}
                  </span>
                </div>

                <label className="mt-6 grid gap-2">
                  <span className="s-section-label">Nombre del jugador</span>
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
                    className="app-input px-4 py-4 text-[16px]"
                    placeholder={`Jugador ${currentIndex + 1}`}
                  />
                </label>

                {savedPlayers.length ? (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRecentOpen((current) => !current)}
                      aria-expanded={isRecentOpen}
                      className="inline-flex items-center justify-between border border-[var(--s-line)] bg-[var(--s-surf)] px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--s-text)]"
                    >
                      <span>Jugadores recientes</span>
                      <span aria-hidden="true" className="font-display text-[18px]">
                        {isRecentOpen ? "^" : "v"}
                      </span>
                    </button>

                    {isRecentOpen ? (
                      <div className="grid max-h-40 gap-2 overflow-y-auto border border-[var(--s-line)] bg-[var(--s-surf)] p-3 sm:max-h-64">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--s-mid)]">
                            Guardados
                          </p>
                          <button
                            type="button"
                            onClick={handleClearRecentPlayers}
                            className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--s-red)]"
                          >
                            Borrar lista
                          </button>
                        </div>

                        {suggestedPlayers.map((name) => (
                          <div
                            key={name}
                            className="flex items-center gap-2 border border-transparent"
                          >
                            <button
                              type="button"
                              onClick={() => handlePickSuggestedPlayer(name)}
                              className="min-w-0 flex-1 px-3 py-2 text-left text-[13px] font-semibold text-[var(--s-text)]"
                            >
                              {name}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveSavedPlayer(name)}
                              aria-label={`Borrar ${name}`}
                              title={`Borrar ${name}`}
                              className="grid h-8 w-8 shrink-0 place-items-center font-mono text-[12px] font-bold text-[var(--s-red)]"
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
                  <div className="mt-4 border border-[var(--s-red)] bg-[rgba(255,61,77,0.08)] px-4 py-3 text-[12px] font-medium text-[var(--s-red)]" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={closePlayerModal}
                    className="app-button app-button-secondary w-full px-4 py-3 text-[18px] sm:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPlayer}
                    className="app-button app-button-primary w-full px-5 py-3 text-[18px] sm:w-auto"
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
