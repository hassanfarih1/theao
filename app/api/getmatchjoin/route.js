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

    // Trouver le player_id via email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Profil introuvable" }),
        { status: 404 }
      );
    }

    // Vérifier si le joueur a déjà rejoint
    const { data: joinData, error: joinError } = await supabase
      .from("joueur_de_match")
      .select("*")
      .eq("match_id", matchId)
      .eq("player_id", profile.id)
      .single();

    if (joinError && joinError.code !== "PGRST116") {
      return new Response(
        JSON.stringify({ success: false, error: joinError.message }),
        { status: 400 }
      );
    }

    const joined = !!joinData;

    // Récupérer tous les joueurs du match avec leur profil
    const { data: players, error: playersError } = await supabase
      .from("joueur_de_match")
      .select(`
        player_id,
        profiles (
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
