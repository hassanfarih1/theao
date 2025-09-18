// app/api/saveprofile/route.js
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST method
export async function POST(req) {
  try {
    const body = await req.json();
    const { email, firstName, lastName, phone, birthDate, gender, pictures } = body;

    if (!email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email, first name, and last name are required",
        }),
        { status: 400 }
      );
    }

    let pictureUrl = null;

    // Upload picture if it exists
    if (pictures) {
      // pictures is expected to be a base64 string starting with "data:image/..."
      const base64Data = pictures.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${uuidv4()}.png`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pictures")
        .upload(fileName, buffer, { contentType: "image/png" });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
      } else {
        pictureUrl = supabase.storage.from("pictures").getPublicUrl(fileName).data.publicUrl;
      }
    }

    // Convert birthDate "JJ/MM/AAAA" -> "YYYY-MM-DD"
    let formattedBirthDate = null;
    if (birthDate) {
      const parts = birthDate.split("/");
      if (parts.length === 3) {
        formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    // Upsert profile and set hasOnboarded to true
    const { data, error } = await supabase.from("profiles").upsert(
      [
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          birth_date: formattedBirthDate,
          gender,
          pictures: pictureUrl,
          hasonboarded: true,
        },
      ],
      { onConflict: "email" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), { status: 500 });
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
