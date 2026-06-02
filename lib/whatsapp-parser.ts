type ParsedWhatsAppPlayers = {
  names: string[];
  totalDetected: number;
  pairingMode: "rotating" | "fixed";
};

const MAX_PLAYERS = 20;

const STOP_PATTERNS = [
  /^lista\s+de\s+espera/i,
  /^en\s+espera$/i,
  /^espera$/i,
  /^suplentes?$/i,
  /^waiting\s+list/i,
];

const COURT_PATTERNS = [
  /^\*?\s*cancha\s*\d+\s*\*?$/i,
  /^\*?\s*court\s*\d+\s*\*?$/i,
];

const PLAYER_LINE_STANDARD = /^\s*(\d+)\s*[-.)]\s*(.+?)\s*$/u;
const PLAYER_LINE_WITH_SYMBOL = /^\s*(\d+)\s*[^\p{L}\p{N}\s]+\s*(.+?)\s*$/u;
const PLAYER_LINE_BULLET = /^\s*[^\p{L}\p{N}\s]+\s*(.+?)\s*$/u;
const PLAYER_LINE_COURT_BULLET = /^\s*[^\p{L}\p{N}\s]+\s*(.+?)\s*$/u;
const FIXED_PAIR_HINT = /parejas?\s+fijas?/iu;
const PAIR_SEPARATOR = /\s*\/\s*/u;
const NON_PLAYER_HINTS = [
  /\b(am|pm)\b/iu,
  /\b\d{1,2}\s*de\s+[a-z]+\b/iu,
  /\bganador\b/iu,
  /\bbebida\b/iu,
  /\bregalo\b/iu,
  /\bjueves\b|\bviernes\b|\bsabado\b|\bdomingo\b|\blunes\b|\bmartes\b|\bmiercoles\b/iu,
  /\b3ra\b|\b4ta\b|\b5ta\b|\b6ta\b/iu,
];

function normalizeName(value: string) {
  return value
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, "")
    .replace(/^[^\p{L}\p{N}(]+/gu, "")
    .replace(/[^\p{L}\p{N})]+$/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeMetadata(value: string) {
  return NON_PLAYER_HINTS.some((pattern) => pattern.test(value));
}

function looksLikePlayerName(value: string) {
  const normalized = normalizeName(value);
  if (!normalized) {
    return false;
  }

  if (looksLikeMetadata(normalized)) {
    return false;
  }

  if (/\d/.test(normalized)) {
    return false;
  }

  return /[\p{L}]{2,}/u.test(normalized);
}

function isLikelyPairLine(value: string) {
  const parts = value
    .split(PAIR_SEPARATOR)
    .map((item) => normalizeName(item))
    .filter(Boolean);

  return parts.length === 2 && parts.every(looksLikePlayerName);
}

export function parseWhatsAppPlayers(message: string): ParsedWhatsAppPlayers {
  const seen = new Set<string>();
  const detected: string[] = [];
  let insideCourtList = false;
  let pairingMode: "rotating" | "fixed" = FIXED_PAIR_HINT.test(message) ? "fixed" : "rotating";

  for (const rawLine of message.split(/\r?\n/)) {
    if (detected.length >= MAX_PLAYERS) {
      break;
    }

    const line = rawLine.replace(/\u00A0/g, " ").trim();
    if (!line) {
      continue;
    }

    if (STOP_PATTERNS.some((pattern) => pattern.test(line))) {
      break;
    }

    if (COURT_PATTERNS.some((pattern) => pattern.test(line))) {
      insideCourtList = true;
      continue;
    }

    const match = line.match(PLAYER_LINE_STANDARD) ?? line.match(PLAYER_LINE_WITH_SYMBOL);
    const bulletMatch = line.match(PLAYER_LINE_BULLET);
    const courtMatch = insideCourtList ? line.match(PLAYER_LINE_COURT_BULLET) : null;
    const bulletCandidate = bulletMatch?.[1] ?? "";
    const candidateSource =
      match?.[2] ??
      courtMatch?.[1] ??
      (isLikelyPairLine(bulletCandidate) ? bulletCandidate : "");

    if (!candidateSource) {
      continue;
    }

    const rawName = normalizeName(candidateSource);
    if (!rawName) {
      continue;
    }

    if (!isLikelyPairLine(rawName) && looksLikeMetadata(rawName)) {
      continue;
    }

    const namesToInsert = isLikelyPairLine(rawName)
      ? rawName
          .split(PAIR_SEPARATOR)
          .map((item) => normalizeName(item))
          .filter(Boolean)
      : [rawName];

    if (namesToInsert.length === 2) {
      pairingMode = "fixed";
    }

    for (const candidate of namesToInsert) {
      const key = candidate.toLocaleLowerCase();
      if (!candidate || seen.has(key)) {
        continue;
      }

      seen.add(key);
      detected.push(candidate);

      if (detected.length >= MAX_PLAYERS) {
        break;
      }
    }
  }

  return {
    names: detected,
    totalDetected: detected.length,
    pairingMode,
  };
}
