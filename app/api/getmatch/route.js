import { createClient } from "@supabase/supabase-js";

// Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Fetch matches with the creator's profile
    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        nom,           
        longitude,
        places,
        prix,
        date_match,
        heure_debut,
        heure_fin,
        created_at,
        player_id,
        profiles (
          pictures
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message, matches: [] }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Map matches and add public URL for profile picture
    const mappedMatches = (data || []).map((match) => {
      let pictureUrl = null;

      if (match.profiles?.pictures) {
        const { data: urlData } = supabase.storage
          .from("pictures") // your bucket name
          .getPublicUrl(match.profiles.pictures);

        pictureUrl = urlData?.publicUrl || null;
      }

      return {
        ...match,
        creator_picture: pictureUrl,
      };
    });

    return new Response(
      JSON.stringify({ success: true, matches: mappedMatches }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in getmatch API:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error", matches: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Allow CORS (important if called from React Native)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
