const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GAME_NAMES = {
  tic: "Morpion",
  mem: "Memory",
  p4: "Puissance 4",
  clk: "Clicker Battle",
  chess: "Échecs",
  g2048: "2048",
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

function formatStats(stats) {
  const popularGame = stats?.popularGame || null;

  return {
    visitors: Number(stats?.visitors) || 0,
    popularGame,
    popularGameName: popularGame ? GAME_NAMES[popularGame] || popularGame : "Aucun",
    popularCount: Number(stats?.popularCount) || 0,
    leaderboard2048: Array.isArray(stats?.leaderboard2048)
      ? stats.leaderboard2048.map(entry => ({
          playerName: entry.playerName || "Joueur",
          score: Number(entry.score) || 0,
          bestTile: Number(entry.bestTile) || 0
        }))
      : []
  };
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
      res.status(200).json(formatStats(await callSupabase("mini_hub_stats")));
      return;
    }

    if (req.method === "POST") {
      const { action, game, sessionId } = req.body || {};

      if (action === "visit" && sessionId) {
        res.status(200).json(formatStats(await callSupabase("mini_hub_visit", {
          p_session_id: String(sessionId).slice(0, 80)
        })));
        return;
      }

      if (action === "play" && GAME_NAMES[game]) {
        res.status(200).json(formatStats(await callSupabase("mini_hub_play", {
          p_game: game
        })));
        return;
      }

      if (action === "score2048") {
        const score = Number(req.body.score) || 0;
        if (!req.body.playerId || score <= 0) {
          res.status(400).json({ error: "Score 2048 invalide." });
          return;
        }

        res.status(200).json(formatStats(await callSupabase("mini_hub_2048_score", {
          p_player_id: String(req.body.playerId).slice(0, 80),
          p_player_name: String(req.body.playerName || "Joueur").slice(0, 24),
          p_score: score,
          p_best_tile: Number(req.body.bestTile) || 0
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
