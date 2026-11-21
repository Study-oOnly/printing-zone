import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

// কাস্টমার নম্বর লিখলে ভেতরে ইমেইল বানিয়ে নেওয়া হয়
export function toEmail(id) {
  const v = id.trim();
  return v.includes("@") ? v : `${v}@printingzone.app`;
}

export default function Login({ onBack }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, toEmail(id), password);
    } catch (err) {
      setError("নম্বর/ইমেইল বা পাসওয়ার্ড ভুল হয়েছে।");
    }
  }

  return (
    <div className="pz pz-login-page">
      <form className="pz-login" onSubmit={handleLogin}>
        <button type="button" className="pz-back" onClick={onBack}>← হোমপেজ</button>
        <h2>লগইন</h2>
        <p className="pz-note">আপনার নিজের প্রিন্ট ও বকেয়া দেখুন।</p>
        <label>
          WhatsApp নম্বর
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="01XXXXXXXXX" />
        </label>
        <label>
          পাসওয়ার্ড
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="pz-error">{error}</p>}
        <button className="pz-btn">প্রবেশ করুন</button>
      </form>
    </div>
  );
}