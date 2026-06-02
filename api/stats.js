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
  tetris: "Tetris",
  magic: "Magic Tiles 3D",
  manrunner: "Man Runner 2048"
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
  return formatted;
}

function normalizeLeaderboardEntries(entries) {
  return parseJsonArray(entries).map(entry => ({
    playerName: entry.playerName || entry.player_name || entry.name || "Joueur",
    score: pickNumber(entry.score, entry.bestScore, entry.best_score),
    bestTile: pickNumber(entry.bestTile, entry.best_tile, entry.tile)
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

  const formatted = {
    visitors: Number(stats?.visitors) || 0,
    popularGame,
    popularGameName: popularGame ? GAME_NAMES[popularGame] || popularGame : "Aucun",
    popularCount: Number(stats?.popularCount) || 0,
    leaderboard2048: normalizeLeaderboardEntries(leaderboard)
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

      res.status(400).json({ error: "Action inconnue." });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Methode non autorisee." });
  } catch (error) {
    res.status(500).json({ error: "Impossible de charger les statistiques." });
  }
}
