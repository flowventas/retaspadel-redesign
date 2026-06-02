import {
  Match,
  MatchScore,
  Player,
  PlayerStats,
  RankingRow,
  Round,
  Tournament,
  TournamentFormat,
  GamesPerMatch,
  PairingMode,
  PlayMode,
} from "@/lib/types";

type GeneratorState = {
  partnerCounts: Record<string, Record<string, number>>;
  opponentCounts: Record<string, Record<string, number>>;
  playedCounts: Record<string, number>;
};

type Pair = [string, string];
type Matchup = [Pair, Pair];
type NullablePair = Pair | null;

const DEFAULT_ROUNDS: Record<TournamentFormat, number> = {
  8: 7,
  12: 9,
  16: 10,
  20: 10,
};

function initMatrix(players: Player[]) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      Object.fromEntries(
        players
          .filter((candidate) => candidate.id !== player.id)
          .map((candidate) => [candidate.id, 0]),
      ),
    ]),
  );
}

function initGeneratorState(players: Player[]): GeneratorState {
  return {
    partnerCounts: initMatrix(players),
    opponentCounts: initMatrix(players),
    playedCounts: Object.fromEntries(players.map((player) => [player.id, 0])),
  };
}

function uniqueKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

function rotate<T>(items: T[], shift: number) {
  if (!items.length) {
    return items;
  }

  const offset = ((shift % items.length) + items.length) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function orderPlayersForAttempt(players: Player[], state: GeneratorState, roundNumber: number, attempt: number) {
  const sorted = [...players].sort((left, right) => {
    const playedGap = state.playedCounts[left.id] - state.playedCounts[right.id];
    if (playedGap !== 0) {
      return playedGap;
    }

    return left.seed - right.seed;
  });

  const rotated = rotate(sorted, roundNumber + attempt);
  if (attempt % 2 === 1) {
    rotated.reverse();
  }

  return rotated;
}

function partnerCost(anchorId: string, candidateId: string, state: GeneratorState, roundNumber: number) {
  return (
    state.partnerCounts[anchorId][candidateId] * 1000 +
    state.playedCounts[anchorId] * 10 +
    state.playedCounts[candidateId] * 10 +
    Math.abs(Number(anchorId.split("-").at(-1)) - Number(candidateId.split("-").at(-1))) +
    roundNumber
  );
}

function matchupCost(anchor: Pair, candidate: Pair, state: GeneratorState) {
  let cost = 0;

  for (const anchorPlayer of anchor) {
    for (const candidatePlayer of candidate) {
      cost += state.opponentCounts[anchorPlayer][candidatePlayer] * 150;
    }
  }

  return cost;
}

function scoreRoundMatches(matches: Matchup[], state: GeneratorState) {
  let cost = 0;

  for (const [teamA, teamB] of matches) {
    cost += state.partnerCounts[teamA[0]][teamA[1]] * 1000;
    cost += state.partnerCounts[teamB[0]][teamB[1]] * 1000;
    cost += matchupCost(teamA, teamB, state);
  }

  return cost;
}

function createGreedyPairs(players: Player[], state: GeneratorState, roundNumber: number) {
  const remaining = [...players];
  const pairs: Pair[] = [];

  while (remaining.length) {
    const anchor = remaining.shift();
    if (!anchor) {
      break;
    }

    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const cost = partnerCost(anchor.id, candidate.id, state, roundNumber);

      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    }

    const [partner] = remaining.splice(bestIndex, 1);
    pairs.push([anchor.id, partner.id]);
  }

  return pairs;
}

function createGreedyMatchups(pairs: Pair[], state: GeneratorState) {
  const remaining = [...pairs];
  const matches: Matchup[] = [];

  while (remaining.length) {
    const anchor = remaining.shift();
    if (!anchor) {
      break;
    }

    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const cost = matchupCost(anchor, candidate, state);

      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    }

    const [opponent] = remaining.splice(bestIndex, 1);
    matches.push([anchor, opponent]);
  }

  return matches;
}

function generateRoundMatches(players: Player[], state: GeneratorState, roundNumber: number) {
  let best: Matchup[] = [];
  let bestCost = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    const ordered = orderPlayersForAttempt(players, state, roundNumber, attempt);
    const pairs = createGreedyPairs(ordered, state, roundNumber);
    const matches = createGreedyMatchups(pairs, state);
    const cost = scoreRoundMatches(matches, state);

    if (cost < bestCost) {
      best = matches;
      bestCost = cost;
    }
  }

  return best;
}

function generateRandomRoundMatches(players: Player[]) {
  const shuffledPlayers = shuffle(players);
  const pairs: Pair[] = [];

  for (let index = 0; index < shuffledPlayers.length; index += 2) {
    const left = shuffledPlayers[index];
    const right = shuffledPlayers[index + 1];

    if (!left || !right) {
      continue;
    }

    pairs.push([left.id, right.id]);
  }

  const matches: Matchup[] = [];

  for (let index = 0; index < pairs.length; index += 2) {
    const teamA = pairs[index];
    const teamB = pairs[index + 1];

    if (!teamA || !teamB) {
      continue;
    }

    matches.push([teamA, teamB]);
  }

  return matches;
}

function createFixedPairs(players: Player[]) {
  const pairs: Pair[] = [];

  for (let index = 0; index < players.length; index += 2) {
    const left = players[index];
    const right = players[index + 1];

    if (!left || !right) {
      continue;
    }

    pairs.push([left.id, right.id]);
  }

  return shuffle(pairs);
}

function rotateRoundRobinPairs(pairs: NullablePair[]) {
  if (pairs.length <= 2) {
    return pairs;
  }

  return [pairs[0], pairs.at(-1) ?? null, ...pairs.slice(1, -1)];
}

function generateFixedPairTemplates(players: Player[]) {
  const basePairs = createFixedPairs(players);
  const pool: NullablePair[] = basePairs.length % 2 === 0 ? basePairs : [...basePairs, null];
  const totalRounds = pool.length - 1;
  const templates: Matchup[][] = [];
  let rotation = [...pool];

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const matches: Matchup[] = [];

    for (let index = 0; index < rotation.length / 2; index += 1) {
      const teamA = rotation[index];
      const teamB = rotation[rotation.length - 1 - index];

      if (!teamA || !teamB) {
        continue;
      }

      matches.push([teamA, teamB]);
    }

    templates.push(matches);
    rotation = rotateRoundRobinPairs(rotation);
  }

  return templates;
}

function generateFixedPairRounds(players: Player[], format: TournamentFormat) {
  const templates = generateFixedPairTemplates(players);
  const roundCount = DEFAULT_ROUNDS[format];

  return Array.from({ length: roundCount }, (_, roundIndex) => {
    const template = templates[roundIndex % templates.length] ?? [];
    const cycle = Math.floor(roundIndex / templates.length);

    return template.map(([teamA, teamB]) => ({
      teamA: cycle % 2 === 0 ? teamA : teamB,
      teamB: cycle % 2 === 0 ? teamB : teamA,
    }));
  });
}

function createRoundFromMatchups(matchups: Matchup[], roundNumber: number): Round {
  return {
    id: `round-${roundNumber}`,
    number: roundNumber,
    restingPlayerIds: [],
    status: "pending",
    updatedAt: null,
    matches: matchups.map(([teamA, teamB], index) => ({
      id: `round-${roundNumber}-match-${index + 1}`,
      court: index + 1,
      teamA,
      teamB,
      score: null,
    })),
  };
}

function createInitialLadderMatchups(players: Player[], pairingMode: PairingMode) {
  if (pairingMode === "fixed") {
    const pairs = createFixedPairs(players);
    const matches: Matchup[] = [];

    for (let index = 0; index < pairs.length; index += 2) {
      const teamA = pairs[index];
      const teamB = pairs[index + 1];

      if (!teamA || !teamB) {
        continue;
      }

      matches.push([teamA, teamB]);
    }

    return matches;
  }

  return generateRandomRoundMatches(players);
}

function getWinningTeam(match: Match) {
  if (!match.score) {
    return null;
  }

  if (match.score.teamA === match.score.teamB) {
    return null;
  }

  return match.score.teamA > match.score.teamB ? match.teamA : match.teamB;
}

function getLosingTeam(match: Match) {
  if (!match.score) {
    return null;
  }

  if (match.score.teamA === match.score.teamB) {
    return null;
  }

  return match.score.teamA > match.score.teamB ? match.teamB : match.teamA;
}

function buildLadderPoolsFromRound(round: Round) {
  const winners = round.matches.map((match) => getWinningTeam(match));
  const losers = round.matches.map((match) => getLosingTeam(match));
  const courtCount = round.matches.length;
  const pools: string[][] = [];

  for (let courtIndex = 0; courtIndex < courtCount; courtIndex += 1) {
    if (courtIndex === 0) {
      pools.push([...(winners[0] ?? []), ...(winners[1] ?? [])]);
      continue;
    }

    if (courtIndex === courtCount - 1) {
      pools.push([...(losers[courtIndex - 1] ?? []), ...(losers[courtIndex] ?? [])]);
      continue;
    }

    pools.push([...(losers[courtIndex - 1] ?? []), ...(winners[courtIndex + 1] ?? [])]);
  }

  return pools;
}

function createBalancedCourtMatchup(pool: string[], previousRound: Round) {
  const [a, b, c, d] = pool;
  const options: Matchup[] = [
    [[a, b], [c, d]],
    [[a, c], [b, d]],
    [[a, d], [b, c]],
  ]
    .filter((matchup) => matchup.every((team) => team[0] && team[1])) as Matchup[];

  const previousPairs = new Set<string>();
  for (const match of previousRound.matches) {
    previousPairs.add(pairSignature(match.teamA));
    previousPairs.add(pairSignature(match.teamB));
  }

  let best = options[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const repeats =
      (previousPairs.has(pairSignature(option[0])) ? 1 : 0) +
      (previousPairs.has(pairSignature(option[1])) ? 1 : 0);

    if (repeats < bestScore) {
      best = option;
      bestScore = repeats;
    }
  }

  return best;
}

function generateNextLadderRound(tournament: Tournament, previousRound: Round): Round {
  const pools = buildLadderPoolsFromRound(previousRound);
  const matchups: Matchup[] = [];

  if (tournament.pairingMode === "fixed") {
    for (let index = 0; index < pools.length; index += 1) {
      const pool = pools[index];
      const teamA = [pool[0], pool[1]] as Pair;
      const teamB = [pool[2], pool[3]] as Pair;
      matchups.push([teamA, teamB]);
    }
  } else {
    for (const pool of pools) {
      matchups.push(createBalancedCourtMatchup(pool, previousRound));
    }
  }

  return createRoundFromMatchups(matchups, previousRound.number + 1);
}

function applyGeneratedRound(round: Round, state: GeneratorState) {
  for (const match of round.matches) {
    const activePlayers = [...match.teamA, ...match.teamB];

    for (const playerId of activePlayers) {
      state.playedCounts[playerId] += 1;
    }

    state.partnerCounts[match.teamA[0]][match.teamA[1]] += 1;
    state.partnerCounts[match.teamA[1]][match.teamA[0]] += 1;
    state.partnerCounts[match.teamB[0]][match.teamB[1]] += 1;
    state.partnerCounts[match.teamB[1]][match.teamB[0]] += 1;

    for (const teamAPlayer of match.teamA) {
      for (const teamBPlayer of match.teamB) {
        state.opponentCounts[teamAPlayer][teamBPlayer] += 1;
        state.opponentCounts[teamBPlayer][teamAPlayer] += 1;
      }
    }
  }
}

export function generateRounds(
  players: Player[],
  format: TournamentFormat,
  pairingMode: PairingMode = "rotating",
  playMode: PlayMode = "standard",
) {
  if (playMode === "ladder") {
    return [createRoundFromMatchups(createInitialLadderMatchups(players, pairingMode), 1)];
  }

  if (pairingMode === "fixed") {
    const scheduledRounds = generateFixedPairRounds(players, format);

    return scheduledRounds.map((matches, roundIndex) =>
      createRoundFromMatchups(
        matches.map((match) => [match.teamA, match.teamB] as Matchup),
        roundIndex + 1,
      ),
    );
  }

  const rounds: Round[] = [];
  const state = initGeneratorState(players);
  const roundCount = DEFAULT_ROUNDS[format];

  for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
    const matchups =
      roundNumber === 1
        ? generateRandomRoundMatches(players)
        : generateRoundMatches(players, state, roundNumber);

    const round = createRoundFromMatchups(matchups, roundNumber);

    applyGeneratedRound(round, state);
    rounds.push(round);
  }

  return rounds;
}

export function createTournament(
  name: string,
  players: Player[],
  format: TournamentFormat,
  gamesPerMatch: GamesPerMatch,
  pairingMode: PairingMode = "rotating",
  playMode: PlayMode = "standard",
  startingCourt = 1,
): Tournament {
  const rounds = generateRounds(players, format, pairingMode, playMode);
  return {
    id: crypto.randomUUID(),
    name,
    format,
    gamesPerMatch,
    pairingMode,
    playMode,
    startingCourt,
    createdAt: new Date().toISOString(),
    players,
    rounds,
    totalRounds: DEFAULT_ROUNDS[format],
    currentRoundIndex: 0,
    completed: false,
  };
}

export function validateRoundScores(round: Round, gamesPerMatch: GamesPerMatch) {
  const missing = round.matches.some((match) => !match.score);
  if (missing) {
    return "Completa todos los scores antes de guardar la ronda.";
  }

  const invalid = round.matches.some((match) => {
    if (!match.score) {
      return true;
    }

    return (
      Number.isNaN(match.score.teamA) ||
      Number.isNaN(match.score.teamB) ||
      match.score.teamA < 0 ||
      match.score.teamB < 0
    );
  });

  if (invalid) {
    return "Los scores deben ser numeros iguales o mayores a cero.";
  }

  const invalidTotal = round.matches.some((match) =>
    match.score ? match.score.teamA + match.score.teamB !== gamesPerMatch : true,
  );
  if (invalidTotal) {
    return `Cada partido debe sumar exactamente ${gamesPerMatch} juegos.`;
  }

  const invalidDraw = gamesPerMatch === 5 && round.matches.some((match) => match.score?.teamA === match.score?.teamB);
  if (invalidDraw) {
    return "En torneos a 5 juegos no puede haber empate.";
  }

  return null;
}

export function updateMatchScore(
  tournament: Tournament,
  roundId: string,
  matchId: string,
  score: MatchScore | null,
) {
  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.id !== roundId
        ? round
        : {
            ...round,
            matches: round.matches.map((match) =>
              match.id !== matchId
                ? match
                : {
                    ...match,
                    score,
                  },
            ),
          },
    ),
  };
}

export function saveRound(tournament: Tournament, roundId: string) {
  const rounds = tournament.rounds.map((round) =>
    round.id !== roundId
      ? round
      : {
          ...round,
          status: "completed" as const,
          updatedAt: new Date().toISOString(),
        },
  );

  let nextRounds = rounds;
  const currentRound = rounds.find((round) => round.id === roundId) ?? null;

  if (
    tournament.playMode === "ladder" &&
    currentRound &&
    currentRound.number < tournament.totalRounds &&
    rounds.every((round) => round.number !== currentRound.number + 1)
  ) {
    nextRounds = [...rounds, generateNextLadderRound(tournament, currentRound)];
  }

  const currentRoundIndex = nextRounds.findIndex((round) => round.status === "pending");

  return {
    ...tournament,
    rounds: nextRounds,
    currentRoundIndex: currentRoundIndex === -1 ? nextRounds.length - 1 : currentRoundIndex,
    completed:
      nextRounds.filter((round) => round.status === "completed").length >= tournament.totalRounds,
  };
}

export function finishTournament(tournament: Tournament) {
  return {
    ...tournament,
    completed: true,
  };
}

export function reopenRound(tournament: Tournament, roundId: string) {
  const roundIndex = tournament.rounds.findIndex((round) => round.id === roundId);
  if (tournament.playMode === "ladder") {
    const rounds = tournament.rounds
      .slice(0, roundIndex + 1)
      .map((round, index) =>
        index < roundIndex
          ? round
          : {
              ...round,
              status: "pending" as const,
              updatedAt: null,
            },
      );

    return {
      ...tournament,
      rounds,
      currentRoundIndex: roundIndex,
      completed: false,
    };
  }

  const rounds = tournament.rounds.map((round, index) =>
    index < roundIndex
      ? round
      : {
          ...round,
          status: "pending" as const,
          updatedAt: null,
          matches: round.matches.map((match) => ({
            ...match,
            score: index === roundIndex ? match.score : null,
          })),
        },
  );

  return {
    ...tournament,
    rounds,
    currentRoundIndex: roundIndex,
    completed: false,
  };
}

function createRankingMap(players: Player[]) {
  return Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        name: player.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gameDiff: 0,
        points: 0,
        rests: 0,
      } satisfies RankingRow,
    ]),
  );
}

function createTeamKey(team: [string, string]) {
  return [team[0], team[1]].sort().join(":");
}

function createFixedPairRankingMap(tournament: Tournament) {
  const rankingMap: Record<string, RankingRow> = {};

  for (const match of tournament.rounds[0]?.matches ?? []) {
    for (const team of [match.teamA, match.teamB] as const) {
      const key = createTeamKey(team);
      if (rankingMap[key]) {
        continue;
      }

      rankingMap[key] = {
        playerId: key,
        name: team.map((playerId) => tournament.players.find((player) => player.id === playerId)?.name ?? playerId).join(" + "),
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gameDiff: 0,
        points: 0,
        rests: 0,
        isTeam: true,
        memberIds: [...team],
      };
    }
  }

  return rankingMap;
}

export function calculateRanking(tournament: Tournament): RankingRow[] {
  if (tournament.pairingMode === "fixed") {
    const rankingMap = createFixedPairRankingMap(tournament);

    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (!match.score) {
          continue;
        }

        const teamAKey = createTeamKey(match.teamA);
        const teamBKey = createTeamKey(match.teamB);
        const teamAScore = match.score.teamA;
        const teamBScore = match.score.teamB;
        const winner = teamAScore === teamBScore ? null : teamAScore > teamBScore ? "A" : "B";

        rankingMap[teamAKey].played += 1;
        rankingMap[teamAKey].gamesFor += teamAScore;
        rankingMap[teamAKey].gamesAgainst += teamBScore;
        rankingMap[teamAKey].points += teamAScore;

        rankingMap[teamBKey].played += 1;
        rankingMap[teamBKey].gamesFor += teamBScore;
        rankingMap[teamBKey].gamesAgainst += teamAScore;
        rankingMap[teamBKey].points += teamBScore;

        if (winner === "A") {
          rankingMap[teamAKey].wins += 1;
          rankingMap[teamBKey].losses += 1;
        } else if (winner === "B") {
          rankingMap[teamBKey].wins += 1;
          rankingMap[teamAKey].losses += 1;
        } else {
          rankingMap[teamAKey].draws += 1;
          rankingMap[teamBKey].draws += 1;
        }
      }
    }

    return Object.values(rankingMap)
      .map((row) => ({
        ...row,
        gameDiff: row.gamesFor - row.gamesAgainst,
      }))
      .sort(
        (left, right) =>
          right.points - left.points ||
          right.gameDiff - left.gameDiff ||
          right.gamesFor - left.gamesFor ||
          left.name.localeCompare(right.name, "es"),
      );
  }

  const rankingMap = createRankingMap(tournament.players);

  for (const round of tournament.rounds) {
    for (const playerId of round.restingPlayerIds) {
      rankingMap[playerId].rests += 1;
    }

    for (const match of round.matches) {
      if (!match.score) {
        continue;
      }

      const teamAScore = match.score.teamA;
      const teamBScore = match.score.teamB;
      const winner = teamAScore === teamBScore ? null : teamAScore > teamBScore ? "A" : "B";

      for (const playerId of match.teamA) {
        rankingMap[playerId].played += 1;
        rankingMap[playerId].gamesFor += teamAScore;
        rankingMap[playerId].gamesAgainst += teamBScore;
        if (winner === "A") {
          rankingMap[playerId].wins += 1;
        } else if (winner === null) {
          rankingMap[playerId].draws += 1;
        } else {
          rankingMap[playerId].losses += 1;
        }
        rankingMap[playerId].points += teamAScore;
      }

      for (const playerId of match.teamB) {
        rankingMap[playerId].played += 1;
        rankingMap[playerId].gamesFor += teamBScore;
        rankingMap[playerId].gamesAgainst += teamAScore;
        if (winner === "B") {
          rankingMap[playerId].wins += 1;
        } else if (winner === null) {
          rankingMap[playerId].draws += 1;
        } else {
          rankingMap[playerId].losses += 1;
        }
        rankingMap[playerId].points += teamBScore;
      }
    }
  }

  return Object.values(rankingMap)
    .map((row) => ({
      ...row,
      gameDiff: row.gamesFor - row.gamesAgainst,
    }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.gameDiff - left.gameDiff ||
        right.gamesFor - left.gamesFor ||
        left.name.localeCompare(right.name, "es"),
    );
}

export function getPlayerStats(tournament: Tournament): PlayerStats[] {
  if (tournament.pairingMode === "fixed") {
    return calculateRanking(tournament).map((row) => ({
      ...row,
      winRate: row.played ? row.wins / row.played : 0,
      averageGamesFor: row.played ? row.gamesFor / row.played : 0,
      averageGamesAgainst: row.played ? row.gamesAgainst / row.played : 0,
      partners: [],
      opponents: [],
    }));
  }

  const rankingMap = Object.fromEntries(
    calculateRanking(tournament).map((row) => [
      row.playerId,
      {
        ...row,
        winRate: row.played ? row.wins / row.played : 0,
        averageGamesFor: row.played ? row.gamesFor / row.played : 0,
        averageGamesAgainst: row.played ? row.gamesAgainst / row.played : 0,
        partners: new Set<string>(),
        opponents: new Set<string>(),
      },
    ]),
  );

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      const [a1, a2] = match.teamA;
      const [b1, b2] = match.teamB;

      rankingMap[a1].partners.add(a2);
      rankingMap[a2].partners.add(a1);
      rankingMap[b1].partners.add(b2);
      rankingMap[b2].partners.add(b1);

      for (const playerA of match.teamA) {
        for (const playerB of match.teamB) {
          rankingMap[playerA].opponents.add(playerB);
          rankingMap[playerB].opponents.add(playerA);
        }
      }
    }
  }

  return Object.values(rankingMap).map((row) => ({
    ...row,
    partners: Array.from(row.partners)
      .map((id) => tournament.players.find((player) => player.id === id)?.name ?? id)
      .sort((left, right) => left.localeCompare(right, "es")),
    opponents: Array.from(row.opponents)
      .map((id) => tournament.players.find((player) => player.id === id)?.name ?? id)
      .sort((left, right) => left.localeCompare(right, "es")),
  }));
}

export function getCurrentRound(tournament: Tournament) {
  return tournament.rounds[tournament.currentRoundIndex] ?? tournament.rounds.at(-1) ?? null;
}

export function isRoundReady(round: Round, gamesPerMatch: GamesPerMatch) {
  return validateRoundScores(round, gamesPerMatch) === null;
}

export function exportTournamentCsv(tournament: Tournament) {
  const ranking = calculateRanking(tournament);
  const lines = [
    ["Pos", "Jugador", "P", "PJ", "PG", "PE", "PP", "GF", "GC", "Diff"].join(","),
    ...ranking.map((row, index) =>
      [
        index + 1,
          `"${row.name}"`,
        row.points,
        row.played,
        row.wins,
        row.draws,
        row.losses,
        row.gamesFor,
        row.gamesAgainst,
        row.gameDiff,
      ].join(","),
    ),
    "",
    ["Ronda", "Cancha", "Pareja A", "Score A", "Score B", "Pareja B"].join(","),
  ];

  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      lines.push(
        [
          round.number,
          getDisplayCourt(match.court, tournament.startingCourt),
          `"${match.teamA.join(" / ")}"`,
          match.score?.teamA ?? "",
          match.score?.teamB ?? "",
          `"${match.teamB.join(" / ")}"`,
        ].join(","),
      );
    }
  }

  return lines.join("\n");
}

export function createPlayers(names: string[]) {
  return names.map((name, index) => ({
    id: `player-${index + 1}`,
    name: name.trim(),
    seed: index + 1,
  }));
}

export function playerNameMap(players: Player[]) {
  return Object.fromEntries(players.map((player) => [player.id, player.name]));
}

export function formatTeam(match: Match, side: "A" | "B", names: Record<string, string>) {
  const team = side === "A" ? match.teamA : match.teamB;
  return team.map((playerId) => names[playerId]).join(" + ");
}

export function formatPlayerList(playerIds: string[], names: Record<string, string>) {
  return playerIds.map((playerId) => names[playerId]).join(", ");
}

export function getDisplayCourt(court: number, startingCourt = 1) {
  return startingCourt + court - 1;
}

export function roundHasScores(round: Round) {
  return round.matches.some((match) => match.score !== null);
}

export function tournamentProgress(tournament: Tournament) {
  const completed = tournament.rounds.filter((round) => round.status === "completed").length;
  return {
    completed,
    total: tournament.totalRounds,
    percentage: Math.round((completed / tournament.totalRounds) * 100),
  };
}

export function duplicateTournament(tournament: Tournament) {
  return createTournament(
    `${tournament.name} (nuevo)`,
    tournament.players.map((player) => ({ ...player })),
    tournament.format,
    tournament.gamesPerMatch,
    tournament.pairingMode,
    tournament.playMode,
    tournament.startingCourt,
  );
}

export function roundLabel(round: Round) {
  return `Ronda ${round.number}`;
}

export function matchWinner(score: MatchScore | null) {
  if (!score) {
    return null;
  }

  return score.teamA === score.teamB ? "draw" : score.teamA > score.teamB ? "A" : "B";
}

export function clampScore(value: number, gamesPerMatch: GamesPerMatch) {
  return Math.max(0, Math.min(gamesPerMatch, value));
}

export function createLinkedScore(teamAScore: number, gamesPerMatch: GamesPerMatch): MatchScore {
  const nextTeamA = clampScore(teamAScore, gamesPerMatch);
  return {
    teamA: nextTeamA,
    teamB: gamesPerMatch - nextTeamA,
  };
}

export function pairSignature(pair: Pair) {
  return uniqueKey(pair[0], pair[1]);
}
