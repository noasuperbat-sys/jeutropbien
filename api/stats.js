const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GAME_NAMES = {
  tic: "Morpion",
  mem: "Memory",
  snake: "Snake",
  p4: "Puissance 4",
  clk: "Clicker Battle",
  simon: "Simon",
  chess: "Échecs",
  g2048: "2048",
  slidepuzzle: "Puzzle coulissant",
  tetris: "Tetris",
  magic: "Magic Tiles 3D",
  manrunner: "Man Runner 2048",
  stack: "Stack",
  stickhook: "Stickman Hook"
};

async function callSupabase(functionName, body = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}`);
  }

  return response.json();
}

async function fetchLeaderboard2048() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_2048_scores?select=player_name,best_score,best_tile,updated_at&order=best_score.desc,best_tile.desc,updated_at.asc&limit=10`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) return [];
  return parseJsonArray(await response.json());
}

async function fetchLeaderboardSlidePuzzle() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_slide_puzzle_scores?select=player_name,completed_levels,total_levels,updated_at&order=completed_levels.desc,updated_at.asc&limit=10`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) return [];
  return parseJsonArray(await response.json());
}

async function fetchLeaderboardStack() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_stack_scores?select=player_name,best_score,updated_at&order=best_score.desc,updated_at.asc&limit=10`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );

  if (!response.ok) return [];
  return parseJsonArray(await response.json());
}

async function saveStackScore({ playerId, playerName, score }) {
  const playerKey = String(playerId).slice(0, 80);
  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_stack_scores?select=best_score&player_id=eq.${encodeURIComponent(playerKey)}&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );
  const existing = existingResponse.ok ? parseJsonArray(await existingResponse.json())[0] : null;
  const bestScore = Math.max(score, pickNumber(existing?.best_score));
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_stack_scores?on_conflict=player_id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        player_id: playerKey,
        player_name: String(playerName || "Joueur").slice(0, 24),
        best_score: bestScore,
        updated_at: new Date().toISOString()
      })
    }
  );
  return response.ok;
}

async function saveSlidePuzzleScore({ playerId, playerName, completedLevels, totalLevels }) {
  const playerKey = String(playerId).slice(0, 80);
  const existingResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_slide_puzzle_scores?select=completed_levels&player_id=eq.${encodeURIComponent(playerKey)}&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );
  const existing = existingResponse.ok ? parseJsonArray(await existingResponse.json())[0] : null;
  const bestCompletedLevels = Math.max(completedLevels, pickNumber(existing?.completed_levels));

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/mini_hub_slide_puzzle_scores?on_conflict=player_id`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        player_id: playerKey,
        player_name: String(playerName || "Joueur").slice(0, 24),
        completed_levels: bestCompletedLevels,
        total_levels: totalLevels,
        updated_at: new Date().toISOString()
      })
    }
  );

  return response.ok;
}

async function fetchPlayerProfile(playerId, playerName = "") {
  const playerKey = String(playerId || "").slice(0, 80);
  const expectedName = String(playerName || "").trim().toLowerCase();
  const [scoreResponse, puzzleResponse] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/mini_hub_2048_scores?select=player_name,best_score,best_tile&player_id=eq.${encodeURIComponent(playerKey)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/mini_hub_slide_puzzle_scores?select=player_name,completed_levels,total_levels&player_id=eq.${encodeURIComponent(playerKey)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )
  ]);
  const score = scoreResponse.ok ? parseJsonArray(await scoreResponse.json())[0] : null;
  const puzzle = puzzleResponse.ok ? parseJsonArray(await puzzleResponse.json())[0] : null;
  const storedName = score?.player_name || puzzle?.player_name || null;
  const codeExists = Boolean(score || puzzle);
  const nameMatches = !expectedName || String(storedName || "").trim().toLowerCase() === expectedName;

  return {
    exists: codeExists && nameMatches,
    playerName2048: nameMatches ? storedName : null,
    bestScore2048: nameMatches ? pickNumber(score?.best_score) : 0,
    bestTile2048: nameMatches ? pickNumber(score?.best_tile) : 0,
    slidePuzzleCompletedLevels: nameMatches ? pickNumber(puzzle?.completed_levels) : 0,
    slidePuzzleTotalLevels: nameMatches ? pickNumber(puzzle?.total_levels) || 13 : 13
  };
}

async function fetchAccountAvailability(playerId, playerName) {
  const playerKey = String(playerId || "").slice(0, 80);
  const cleanName = String(playerName || "").trim().toLowerCase();
  const [code2048Response, codePuzzleResponse, name2048Response, namePuzzleResponse] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/mini_hub_2048_scores?select=player_id&player_id=eq.${encodeURIComponent(playerKey)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/mini_hub_slide_puzzle_scores?select=player_id&player_id=eq.${encodeURIComponent(playerKey)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/mini_hub_2048_scores?select=player_id&player_name=ilike.${encodeURIComponent(cleanName)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/mini_hub_slide_puzzle_scores?select=player_id&player_name=ilike.${encodeURIComponent(cleanName)}&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )
  ]);
  const code2048Rows = code2048Response.ok ? parseJsonArray(await code2048Response.json()) : [];
  const codePuzzleRows = codePuzzleResponse.ok ? parseJsonArray(await codePuzzleResponse.json()) : [];
  const name2048Rows = name2048Response.ok ? parseJsonArray(await name2048Response.json()) : [];
  const namePuzzleRows = namePuzzleResponse.ok ? parseJsonArray(await namePuzzleResponse.json()) : [];
  const codeRows = [...code2048Rows, ...codePuzzleRows];
  const nameRows = [...name2048Rows, ...namePuzzleRows];
  const sameAccount = nameRows.some(row => String(row.player_id) === playerKey);

  return {
    available: !codeRows.length && (!nameRows.length || sameAccount)
  };
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function pickNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function normalizeStatsPayload(payload) {
  if (Array.isArray(payload)) return normalizeStatsPayload(payload[0] || {});
  if (payload?.data) return normalizeStatsPayload(payload.data);
  return payload || {};
}

async function formatStatsWithLeaderboardFallback(stats) {
  const formatted = formatStats(stats);
  if (!formatted.leaderboard2048.length) {
    formatted.leaderboard2048 = normalizeLeaderboardEntries(await fetchLeaderboard2048());
  }
  if (!formatted.leaderboardSlidePuzzle.length) {
    formatted.leaderboardSlidePuzzle = normalizeSlidePuzzleLeaderboardEntries(await fetchLeaderboardSlidePuzzle());
  }
  if (!formatted.leaderboardStack.length) {
    formatted.leaderboardStack = normalizeStackLeaderboardEntries(await fetchLeaderboardStack());
  }
  return formatted;
}

function normalizeLeaderboardEntries(entries) {
  return parseJsonArray(entries).map(entry => ({
    playerName: entry.playerName || entry.player_name || entry.name || "Joueur",
    score: pickNumber(entry.score, entry.bestScore, entry.best_score),
    bestTile: pickNumber(entry.bestTile, entry.best_tile, entry.tile)
  }));
}

function normalizeSlidePuzzleLeaderboardEntries(entries) {
  return parseJsonArray(entries).map(entry => ({
    playerName: entry.playerName || entry.player_name || entry.name || "Joueur",
    completedLevels: pickNumber(entry.completedLevels, entry.completed_levels, entry.level, entry.bestLevel, entry.best_level),
    totalLevels: pickNumber(entry.totalLevels, entry.total_levels) || 13
  }));
}

function normalizeStackLeaderboardEntries(entries) {
  return parseJsonArray(entries).map(entry => ({
    playerName: entry.playerName || entry.player_name || entry.name || "Joueur",
    score: pickNumber(entry.score, entry.bestScore, entry.best_score)
  }));
}

function formatStats(stats) {
  stats = normalizeStatsPayload(stats);
  const popularGame = stats?.popularGame || null;
  const leaderboard = parseJsonArray(
    stats?.leaderboard2048 ||
    stats?.leaderboard_2048 ||
    stats?.leaderboard ||
    stats?.scores2048 ||
    stats?.scores_2048
  );
  const leaderboardSlidePuzzle = parseJsonArray(
    stats?.leaderboardSlidePuzzle ||
    stats?.leaderboard_slide_puzzle ||
    stats?.slidePuzzleLeaderboard ||
    stats?.scoresSlidePuzzle ||
    stats?.scores_slide_puzzle
  );
  const leaderboardStack = parseJsonArray(
    stats?.leaderboardStack ||
    stats?.leaderboard_stack ||
    stats?.stackLeaderboard ||
    stats?.scoresStack ||
    stats?.scores_stack
  );

  const formatted = {
    visitors: Number(stats?.visitors) || 0,
    popularGame,
    popularGameName: popularGame ? GAME_NAMES[popularGame] || popularGame : "Aucun",
    popularCount: Number(stats?.popularCount) || 0,
    leaderboard2048: normalizeLeaderboardEntries(leaderboard),
    leaderboardSlidePuzzle: normalizeSlidePuzzleLeaderboardEntries(leaderboardSlidePuzzle),
    leaderboardStack: normalizeStackLeaderboardEntries(leaderboardStack)
  };

  if (stats?.playerName2048) formatted.playerName2048 = stats.playerName2048;
  if (typeof stats?.name2048Taken === "boolean") formatted.name2048Taken = stats.name2048Taken;

  return formatted;
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(501).json({
      error: "Supabase n'est pas encore connecte au projet Vercel."
    });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_stats")));
      return;
    }

    if (req.method === "POST") {
      const { action, game, sessionId } = req.body || {};

      if (action === "visit" && sessionId) {
        res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_visit", {
          p_session_id: String(sessionId).slice(0, 80)
        })));
        return;
      }

      if (action === "play" && GAME_NAMES[game]) {
        res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_play", {
          p_game: game
        })));
        return;
      }

      if (action === "profile") {
        if (!req.body.playerId) {
          res.status(400).json({ error: "Profil joueur invalide." });
          return;
        }

        const stats = await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_stats"));
        res.status(200).json({
          ...stats,
          profile: await fetchPlayerProfile(req.body.playerId, req.body.playerName)
        });
        return;
      }

      if (action === "accountAvailability") {
        if (!req.body.playerId || !req.body.playerName) {
          res.status(400).json({ error: "Compte joueur invalide." });
          return;
        }

        res.status(200).json(await fetchAccountAvailability(req.body.playerId, req.body.playerName));
        return;
      }

      if (action === "name2048") {
        if (!req.body.playerId) {
          res.status(400).json({ error: "Joueur 2048 invalide." });
          return;
        }

        res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_2048_name", {
          p_player_id: String(req.body.playerId).slice(0, 80),
          p_player_name: String(req.body.playerName || "Joueur").slice(0, 24)
        })));
        return;
      }

      if (action === "score2048") {
        const score = Number(req.body.score) || 0;
        const bestTile = Number(req.body.bestTile) || 0;
        if (!req.body.playerId || bestTile <= 0) {
          res.status(400).json({ error: "Score 2048 invalide." });
          return;
        }

        res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_2048_score", {
          p_player_id: String(req.body.playerId).slice(0, 80),
          p_player_name: String(req.body.playerName || "Joueur").slice(0, 24),
          p_score: score,
          p_best_tile: bestTile
        })));
        return;
      }

      if (action === "scoreSlidePuzzle") {
        const completedLevels = Number(req.body.completedLevels) || 0;
        const totalLevels = Number(req.body.totalLevels) || 13;
        if (!req.body.playerId || completedLevels <= 0) {
          res.status(400).json({ error: "Score puzzle invalide." });
          return;
        }

        try {
          res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_slide_puzzle_score", {
            p_player_id: String(req.body.playerId).slice(0, 80),
            p_player_name: String(req.body.playerName || "Joueur").slice(0, 24),
            p_completed_levels: completedLevels,
            p_total_levels: totalLevels
          })));
        } catch (error) {
          await saveSlidePuzzleScore({
            playerId: req.body.playerId,
            playerName: req.body.playerName,
            completedLevels,
            totalLevels
          });
          res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_stats")));
        }
        return;
      }

      if (action === "scoreStack") {
        const score = Number(req.body.score) || 0;
        if (!req.body.playerId || score <= 0) {
          res.status(400).json({ error: "Score Stack invalide." });
          return;
        }

        try {
          res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_stack_score", {
            p_player_id: String(req.body.playerId).slice(0, 80),
            p_player_name: String(req.body.playerName || "Joueur").slice(0, 24),
            p_score: score
          })));
        } catch (error) {
          await saveStackScore({
            playerId: req.body.playerId,
            playerName: req.body.playerName,
            score
          });
          res.status(200).json(await formatStatsWithLeaderboardFallback(await callSupabase("mini_hub_stats")));
        }
        return;
      }

      res.status(400).json({ error: "Action inconnue." });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Methode non autorisee." });
  } catch (error) {
    res.status(500).json({ error: "Impossible de charger les statistiques." });
  }
}
