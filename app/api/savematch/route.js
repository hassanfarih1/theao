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

    if (!email || !nom || !places || !dateMatch || !heureDebut || !heureFin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
        }),
        { status: 400 }
      );
    }

    // Convert date "DD/MM/YYYY" -> "YYYY-MM-DD"
    let formattedDate = null;
    if (dateMatch) {
      const parts = dateMatch.split("/");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
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

    // Insert into matches
    const { data, error } = await supabase.from("matches").insert([
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
        player_id: profile.id,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
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
