import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { userEmail, matchId } = await req.json();

    if (!userEmail || !matchId) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and matchId are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1️⃣ Fetch match to check creator
    const { data: matchData, error: fetchError } = await supabase
      .from("matches")
      .select("id, player_id, profiles(email)")
      .eq("id", matchId)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!matchData) {
      return new Response(
        JSON.stringify({ success: false, error: "Match not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if the requesting user is the creator
    const isCreator = matchData.profiles?.email === userEmail;

    if (!isCreator) {
      return new Response(
        JSON.stringify({ success: false, error: "You are not the creator of this match." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2️⃣ Delete related joueur_de_match rows
    const { error: deletePlayersError } = await supabase
      .from("joueur_de_match")
      .delete()
      .eq("match_id", matchId);

    if (deletePlayersError) {
      return new Response(
        JSON.stringify({ success: false, error: deletePlayersError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3️⃣ Delete the match itself
    const { error: deleteMatchError } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (deleteMatchError) {
      return new Response(
        JSON.stringify({ success: false, error: deleteMatchError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Match and related players deleted." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in deletematch API:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Allow CORS
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
