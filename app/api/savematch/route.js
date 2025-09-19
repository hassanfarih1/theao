import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST method
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      email,              // from user (to link with profiles)
      nom,
      description,
      communicationLink,
      localisation,
      latitude,
      longitude,
      places,
      prix,
      dateMatch,          // expected format "DD/MM/YYYY"
      heureDebut,         // expected format "HH:MM"
      heureFin            // expected format "HH:MM"
    } = body;

    // Validate required fields
    if (!email || !nom || !places || !dateMatch || !heureDebut || !heureFin) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // Convert date "DD/MM/YYYY" -> "YYYY-MM-DD"
    let formattedDate = null;
    const parts = dateMatch.split("/");
    if (parts.length === 3) {
      formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    // Find player_id from profiles by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Profile not found" }),
        { status: 404 }
      );
    }

    // Insert into matches and return the inserted row
    const { data: matchData, error: matchError } = await supabase
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
          date_match: formattedDate,
          heure_debut: heureDebut,
          heure_fin: heureFin,
          player_id: profile.id, // creator of the match
        },
      ])
      .select() // needed to return the inserted row
      .single();

    if (matchError) {
      console.error("Supabase insert match error:", matchError);
      return new Response(
        JSON.stringify({ success: false, error: matchError.message }),
        { status: 400 }
      );
    }

    // Automatically add creator to match_players table
    const { data: joinData, error: joinError } = await supabase
      .from("joueur_de_match")
      .insert([
        {
          match_id: matchData.id,  // newly created match ID
          player_id: profile.id,   // creator's profile ID
        },
      ]);

    if (joinError) {
      console.error("Supabase insert join error:", joinError);
      return new Response(
        JSON.stringify({ success: false, error: joinError.message }),
        { status: 400 }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({ success: true, match: matchData, joined: joinData }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Server error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500 }
    );
  }
}

// OPTIONS method for CORS
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
