// app/api/saveprofile/route.js
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to get a unique filename
async function getUniqueFileName(bucket, originalName) {
  let name = originalName;
  let ext = "";
  let base = originalName;

  const dotIndex = originalName.lastIndexOf(".");
  if (dotIndex !== -1) {
    ext = originalName.substring(dotIndex); // ".png"
    base = originalName.substring(0, dotIndex); // "foto"
  }

  let counter = 1;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list("", { search: name });
    if (error) break; // stop if error
    if (!data || data.length === 0) break; // available name
    name = `${base}${counter}${ext}`;
    counter++;
  }

  return name;
}

export async function POST(req) {
  try {
    const formData = await req.formData();

    const email = formData.get("email");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const phone = formData.get("phone");
    const birthDate = formData.get("birthDate");
    const gender = formData.get("gender");
    const picture = formData.get("picture"); // File

    if (!email || !firstName || !lastName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email, first name, and last name are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let pictureName = null;

    // Direct upload to Supabase Storage
    if (picture && picture.size > 0) {
      const arrayBuffer = await picture.arrayBuffer(); // convert to buffer
      const buffer = Buffer.from(arrayBuffer);

      const uniqueName = await getUniqueFileName("pictures", picture.name);

      const { error: uploadError } = await supabase.storage
        .from("pictures")
        .upload(uniqueName, buffer, {
          contentType: picture.type || "image/png",
          upsert: false, // prevent overwrite
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
      } else {
        pictureName = uniqueName; // save file name in DB
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

    // Upsert profile
    const { data, error } = await supabase.from("profiles").upsert(
      [
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          birth_date: formattedBirthDate,
          gender,
          pictures: pictureName,
          hasonboarded: true,
        },
      ],
      { onConflict: "email" }
    );

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data, pictureName }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Server error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
