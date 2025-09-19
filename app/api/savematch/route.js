import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client (server-side, use service role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      email,
      nom,
      description,
      communicationLink,
      localisation,
      latitude,
      longitude,
      places,
      prix,
      dateMatch,
      heureDebut,
      heureFin,
    } = body;

    if (
      !email ||
      !nom ||
      !description ||
      !communicationLink ||
      !localisation ||
      !places ||
      !prix ||
      !dateMatch ||
      !heureDebut ||
      !heureFin
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs requis manquants" }),
        { status: 400 }
      );
    }

    // 1️⃣ Find creator profile
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

    // 2️⃣ Insert match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert([
        {
          nom,
          description,
          communication_link: communicationLink,
          localisation,
          latitude,
          longitude,
          places,
          prix,
          date_match: dateMatch,
          heure_debut: heureDebut,
          heure_fin: heureFin,
          player_id: profile.id, // link to creator
        },
      ])
      .select("id") // return match ID
      .single();

    if (matchError) {
      console.error("Supabase insert error (match):", matchError);
      return new Response(
        JSON.stringify({ success: false, error: matchError.message }),
        { status: 400 }
      );
    }

    // 3️⃣ Insert creator into joueur_de_match
    const { error: joinError } = await supabase.from("joueur_de_match").insert([
      {
        match_id: match.id,
        player_id: profile.id,
        joined_at: new Date().toISOString(),
      },
    ]);

    if (joinError) {
      console.error("Supabase insert error (auto-join):", joinError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Match créé mais l'auto-join a échoué",
          matchId: match.id,
        }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Match créé et créateur ajouté automatiquement",
        matchId: match.id,
      }),
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
