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

    // Récupérer tous les joueurs de ce match avec leurs profils
    const { data: playersData, error: playersError } = await supabase
      .from("joueur_de_match")
      .select(`
        profiles (
          first_name,
          last_name,
          phone,
          pictures
        )
      `)
      .eq("match_id", matchId);

    if (playersError) {
      console.error("Error fetching players:", playersError);
    }

    // Générer l'URL publique pour chaque image
    const players = (playersData || []).map((p) => {
      let pictureUrl = null;
      if (p.profiles?.pictures) {
        const { data: urlData } = supabase.storage
          .from("pictures")
          .getPublicUrl(p.profiles.pictures);
        pictureUrl = urlData?.publicUrl || null;
      }
      return {
        first_name: p.profiles?.first_name || null,
        last_name: p.profiles?.last_name || null,
        phone: p.profiles?.phone || null,
        picture: pictureUrl,
      };
    });

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
