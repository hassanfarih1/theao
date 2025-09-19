import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, matchId } = body;

    if (!email || !matchId) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs requis manquants" }),
        { status: 400 }
      );
    }

    // Récupérer tous les joueurs du match avec leurs profils
    const { data: players, error: playersError } = await supabase
      .from("joueur_de_match")
      .select(`
        player_id,
        profiles (
          id,
          email,
          first_name,
          last_name,
          phone,
          picture
        )
      `)
      .eq("match_id", matchId);

    if (playersError) {
      return new Response(
        JSON.stringify({ success: false, error: playersError.message }),
        { status: 400 }
      );
    }

    // Vérifier si l'utilisateur a déjà rejoint
    const joined = players.some(p => p.profiles?.email === email);

    return new Response(
      JSON.stringify({ success: true, joined, players }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Server error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur interne du serveur" }),
      { status: 500 }
    );
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
