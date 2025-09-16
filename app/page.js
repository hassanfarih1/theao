// pages/testProfile.js
'use client'
import { useState } from "react";

export default function TestProfile() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/saveprofile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, phone, birthDate, gender }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({ success: false, error: err.message });
    }
  };

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif" }}>
      <h1>Test SaveProfile API</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <input placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input placeholder="Birth Date (JJ/MM/AAAA)" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <input placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)} />
        <button type="submit">Submit</button>
      </form>

      {response && (
        <div style={{ marginTop: "20px" }}>
          <h2>Response:</h2>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
