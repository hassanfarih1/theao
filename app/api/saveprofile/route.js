// pages/api/saveprofile.js
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key (server-side only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Handle preflight CORS requests
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Parse body
  const { email, firstName, lastName, phone, birthDate, gender } = req.body;

  if (!email || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: "Email, first name, and last name are required",
    });
  }

  // Convert birthDate "JJ/MM/AAAA" -> "YYYY-MM-DD"
  let formattedBirthDate = null;
  if (birthDate) {
    const parts = birthDate.split("/");
    if (parts.length === 3) {
      formattedBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  try {
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
        },
      ],
      { onConflict: "email" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
