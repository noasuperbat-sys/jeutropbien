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
    popularCount: Number(stats?.popularCount) || 0
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

      res.status(400).json({ error: "Action inconnue." });
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Methode non autorisee." });
  } catch (error) {
    res.status(500).json({ error: "Impossible de charger les statistiques." });
  }
}

