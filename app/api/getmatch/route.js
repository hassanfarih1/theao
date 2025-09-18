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
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400 }
      );
    }

    // Map matches and add public URL for profile picture
    const mappedMatches = data.map((match) => {
      let pictureUrl = null;
      if (match.profiles?.pictures) {
        const { data: urlData } = supabase.storage
          .from("pictures") // your bucket name
          .getPublicUrl(match.profiles.pictures);
        pictureUrl = urlData.publicUrl;
      }

      return {
        ...match,
        creator_picture: pictureUrl,
      };
    });

    return new Response(
      JSON.stringify({ success: true, data: mappedMatches }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in getmatch API:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500 }
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
