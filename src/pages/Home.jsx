import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { CLOUD_NAME, UPLOAD_PRESET } from "../cloudinary";

const MAX_MB = 10;

const RATES = [
  ["BW", "S", "2.5"], ["BW", "B", "3.5"], ["BW", "C", "2.0"],
  ["C", "S", "3.5"], ["C", "B", "4.5"], ["C", "P", "6.0"],
];

async function uploadToCloud(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) throw new Error("upload failed");
  return res.json();
}

export default function Home({ onLogin }) {
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [files, setFiles] = useState([]);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !batch.trim()) return setError("নাম ও ব্যাচ অবশ্যই দিতে হবে।");
    if (files.length === 0) return setError("কমপক্ষে একটি ফাইল বাছাই করুন।");
    if (files.some((f) => f.size > MAX_MB * 1024 * 1024))
      return setError(`প্রতিটি ফাইল ${MAX_MB} MB-এর মধ্যে হতে হবে।`);

    setState("sending");
    try {
      for (const file of files) {
        const data = await uploadToCloud(file);
        await addDoc(collection(db, "uploads"), {
          name: name.trim(),
          batch: batch.trim(),
          whatsapp: whatsapp.trim(),
          fileName: file.name,
          fileUrl: data.secure_url,
          size: file.size,
          createdAt: serverTimestamp(),
        });
      }
      setState("done");
      setFiles([]);
    } catch (err) {
      console.error(err);
      setError("আপলোড হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।");
      setState("idle");
    }
  }

  function again() {
    setState("idle");
    setName(""); setBatch(""); setWhatsapp("");
  }

  return (
    <div className="pz">
      <header className="pz-nav">
        <div className="pz-logo">Printing<span>Zone</span></div>
        <nav>
          <a href="#upload">ফাইল পাঠান</a>
          <a href="#rates">রেট</a>
          <button className="pz-btn-line" onClick={onLogin}>লগইন</button>
        </nav>
      </header>

      <section className="pz-hero">
        <div className="pz-hero-text">
          <p className="pz-tag">Room 308</p>
          <h1>ফাইল পাঠিয়ে দিন,<br />প্রিন্ট <em>তৈরি</em> থাকবে।</h1>
          <p className="pz-lead">
            ক্লাসের ফাইল, অ্যাসাইনমেন্ট, কভার পেজ, প্রশ্নপত্র, যা-ই হোক। নাম আর ব্যাচ লিখে ফাইল দিন, বাকিটা আমরা দেখব।
            অ্যাকাউন্ট থাকলে লগইন করে নিজের প্রিন্টের হিসাব আর বকেয়া দেখতে পারবেন।
          </p>
          <div className="pz-hero-actions">
            <a href="#upload" className="pz-btn">ফাইল আপলোড করুন</a>
            <a href="https://wa.me/8801644059191" className="pz-link">WhatsApp: 01644059191</a>
          </div>
        </div>

        <div className="pz-receipt" aria-hidden="true">
          <div className="pz-receipt-head">
            <b>PRINTING ZONE</b>
            <span>Room: 308</span>
            <span>WhatsApp: 01644059191</span>
          </div>
          <div className="pz-dash" />
          <div className="pz-row"><span>CUSTOMER: RAFI</span></div>
          <div className="pz-row"><span>1. 12/11 · 5p (BW)</span><span>৳12.5</span></div>
          <div className="pz-row"><span>2. 14/11 · 12p (BW)</span><span>৳30.0</span></div>
          <div className="pz-row"><span>3. 15/11 · 2p (C)</span><span>৳7.0</span></div>
          <div className="pz-dash" />
          <div className="pz-row"><span>Subtotal</span><span>৳49.5</span></div>
          <div className="pz-row"><span>Discount</span><span>-৳5.0</span></div>
          <div className="pz-row pz-total"><span>TOTAL</span><span>৳44.5</span></div>
          <div className="pz-dash" />
          <div className="pz-small">Bkash: 01816657670</div>
          <div className="pz-small">নমুনা রিসিপ্ট</div>
        </div>
      </section>

      <section className="pz-section" id="upload">
        <div className="pz-upload">
          <div className="pz-upload-side">
            <h2>ফাইল জমা দিন</h2>
            <p>লগইন লাগবে না। নাম আর ব্যাচ দিলেই হবে। প্রতিটি ফাইল সর্বোচ্চ {MAX_MB} MB।</p>
            <p className="pz-note">WhatsApp নম্বর দিলে পরে আপনার জন্য অ্যাকাউন্ট খুলে দেওয়া সহজ হবে।</p>
          </div>

          {state === "done" ? (
            <div className="pz-done">
              <h3>ফাইল পৌঁছে গেছে ✓</h3>
              <p>আমরা ফাইল দেখে প্রিন্ট করে রাখব।</p>
              <button className="pz-btn" onClick={again}>আরেকটি ফাইল পাঠান</button>
            </div>
          ) : (
            <form onSubmit={submit} className="pz-form">
              <label>
                নাম <i>*</i>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="আপনার নাম" />
              </label>
              <label>
                ব্যাচ <i>*</i>
                <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="যেমন: 24th" />
              </label>
              <label>
                WhatsApp নম্বর <small>(না দিলেও চলবে)</small>
                <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                  inputMode="numeric" placeholder="01XXXXXXXXX" />
              </label>
              <label>
                ফাইল <i>*</i>
                <input type="file" multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={(e) => setFiles(Array.from(e.target.files))} />
              </label>
              {files.length > 0 && (
                <ul className="pz-files">
                  {files.map((f) => (
                    <li key={f.name}>{f.name} <small>({(f.size / 1024 / 1024).toFixed(1)} MB)</small></li>
                  ))}
                </ul>
              )}
              {error && <p className="pz-error">{error}</p>}
              <button className="pz-btn" disabled={state === "sending"}>
                {state === "sending" ? "পাঠানো হচ্ছে..." : "জমা দিন"}
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="pz-section" id="rates">
        <h2>প্রিন্টের রেট</h2>
        <p className="pz-note">প্রতি পৃষ্ঠার দাম</p>
        <div className="pz-rates">
          {RATES.map(([t, s, p]) => (
            <div className="pz-rate" key={t + s}>
              <span className="pz-rate-code">{t} · {s}</span>
              <span className="pz-rate-price">৳{p}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="pz-footer">
        <div>
          <b>Printing Zone</b>
          <span>Room: 308</span>
        </div>
        <div>
          <span>WhatsApp: 01644059191</span>
          <span>Bkash: 01816657670 (cashout charge সহ পাঠাবেন)</span>
        </div>
      </footer>
    </div>
  );
}