import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { CLOUD_NAME, UPLOAD_PRESET } from "../cloudinary";
import { createCustomerAccount, isValidPhone, resolveIdentity } from "../utils/signup";

const MAX_MB = 10;

// S = Single side, B = Both side, C = Cover page, P = Photo
const RATES = [
  ["B&W", "Single side", "2.5"],
  ["B&W", "Both side", "3.5"],
  ["B&W", "Cover page", "2.0"],
  ["Color", "Single side", "3.5"],
  ["Color", "Both side", "4.5"],
  ["Color", "Photo", "6.0"],
];

const SERVICES = [
  ["Scan", "2"],
  ["Passport size photo", "5"],
  ["Glossy paper print", "6"],
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

function PrinterArt() {
  return (
    <svg viewBox="0 0 520 440" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="pbBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e4e7fb" />
        </linearGradient>
        <linearGradient id="pbTop" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4f3df5" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
        <linearGradient id="pbCircle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ddd5ff" />
          <stop offset="1" stopColor="#c3f2e0" />
        </linearGradient>
      </defs>

      <circle cx="270" cy="215" r="190" fill="url(#pbCircle)" opacity="0.75" />

      <g transform="rotate(-6 260 110)">
        <rect x="170" y="40" width="190" height="130" rx="8" fill="#ffffff" stroke="#d9dcf5" />
        <rect x="190" y="62" width="90" height="8" rx="4" fill="#cfd3f3" />
        <rect x="190" y="82" width="150" height="6" rx="3" fill="#e4e6f8" />
        <rect x="190" y="98" width="140" height="6" rx="3" fill="#e4e6f8" />
        <rect x="190" y="114" width="120" height="6" rx="3" fill="#e4e6f8" />
      </g>

      <rect x="70" y="150" width="380" height="170" rx="28" fill="url(#pbBody)" stroke="#d3d7f3" strokeWidth="2" />
      <rect x="70" y="150" width="380" height="54" rx="28" fill="url(#pbTop)" />
      <rect x="70" y="180" width="380" height="24" fill="url(#pbTop)" />
      <rect x="100" y="166" width="120" height="10" rx="5" fill="#ffffff" opacity="0.35" />

      <circle cx="400" cy="228" r="9" fill="#22c55e" />
      <circle cx="372" cy="228" r="9" fill="#fbbf24" />
      <rect x="96" y="216" width="110" height="26" rx="13" fill="#0f0d2e" />
      <text x="151" y="234" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff" fontFamily="Arial, sans-serif">READY</text>

      <rect x="110" y="272" width="300" height="16" rx="8" fill="#1b1850" />

      <g>
        <rect x="140" y="278" width="240" height="140" rx="8" fill="#ffffff" stroke="#d9dcf5" />
        <rect x="160" y="300" width="100" height="10" rx="5" fill="#4f3df5" />
        <rect x="160" y="322" width="200" height="6" rx="3" fill="#e4e6f8" />
        <rect x="160" y="338" width="180" height="6" rx="3" fill="#e4e6f8" />
        <rect x="160" y="354" width="195" height="6" rx="3" fill="#e4e6f8" />
        <rect x="160" y="378" width="60" height="22" rx="11" fill="#e6e2ff" />
        <rect x="300" y="372" width="56" height="30" rx="6" fill="#22c55e" opacity="0.85" />
      </g>

      <rect x="110" y="318" width="40" height="10" rx="5" fill="#c9cdf0" />
      <rect x="370" y="318" width="40" height="10" rx="5" fill="#c9cdf0" />

      <g>
        <rect x="392" y="330" width="116" height="44" rx="22" fill="#ffffff" stroke="#e3e6f6" />
        <circle cx="416" cy="352" r="12" fill="#e6f9ef" />
        <text x="416" y="357" textAnchor="middle" fontSize="13" fontWeight="800" fill="#16a34a" fontFamily="Arial, sans-serif">৳</text>
        <text x="436" y="357" fontSize="13" fontWeight="700" fill="#0f0d2e" fontFamily="Arial, sans-serif">Low cost</text>
      </g>
    </svg>
  );
}

function Badge() {
  return (
    <svg className="pb-badge" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id="pbCirclePath" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      <text fontSize="11.5" fontWeight="700" fill="#0f0d2e" letterSpacing="2.4" fontFamily="Arial, sans-serif">
        <textPath href="#pbCirclePath">PRINT • COPY • SCAN • BIND •</textPath>
      </text>
      <path d="M40 40h20v20H40z" fill="none" stroke="#4f3df5" strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 40v-6h12v6M44 60v6h12v-6" fill="none" stroke="#4f3df5" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

const FEATS = [
  ["Fast, Crisp & Clean Prints", "M13 2L3 14h8l-1 8 10-12h-8z"],
  ["Low price guarantee", "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"],
  ["Bill on WhatsApp", "M21 11.5a8.5 8.5 0 01-12.6 7.4L3 20l1.2-5.2A8.5 8.5 0 1121 11.5z"],
  ["Track your dues online", "M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"],
];

export default function Home({ onLogin }) {
  const [name, setName] = useState("");
  const [batch, setBatch] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [files, setFiles] = useState([]);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [account, setAccount] = useState(""); // "", "created", "exists", "failed"
  const [savedNumber, setSavedNumber] = useState("");
  const [savedName, setSavedName] = useState("");
  const [typedName, setTypedName] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    const num = whatsapp.trim();
    if (!name.trim() || !batch.trim()) return setError("Name and batch are required.");
    if (!isValidPhone(num))
      return setError("Enter a valid 11-digit WhatsApp number (01XXXXXXXXX).");
    if (files.length === 0) return setError("Please choose at least one file.");
    if (files.some((f) => f.size > MAX_MB * 1024 * 1024))
      return setError(`Each file must be under ${MAX_MB} MB.`);

    setState("sending");

    // Your WhatsApp number identifies you. If you used it before, we keep the name saved then.
    const id = await resolveIdentity(db, name, num);
    if (!id.ok) {
      setError("Something went wrong. Please try again.");
      setState("idle");
      return;
    }
    const finalName = id.name;

    try {
      for (const file of files) {
        const data = await uploadToCloud(file);
        await addDoc(collection(db, "uploads"), {
          name: finalName,
          batch: batch.trim(),
          whatsapp: num,
          fileName: file.name,
          fileUrl: data.secure_url,
          size: file.size,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please check your internet and try again.");
      setState("idle");
      return;
    }

    // Files are saved. Now try to create the account (never blocks the upload).
    const r = await createCustomerAccount({ name: finalName, batch, whatsapp: num });
    setAccount(r.status === "created" ? "created" : r.status === "exists" ? "exists" : "failed");
    setSavedNumber(num);
    setSavedName(finalName);
    setTypedName(name.trim());
    setState("done");
    setFiles([]);
  }

  function again() {
    setState("idle");
    setAccount("");
    setSavedNumber("");
    setSavedName("");
    setTypedName("");
    setName(""); setBatch(""); setWhatsapp("");
  }

  return (
    <div className="pb">
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');"}</style>

      <div className="pb-top">
        <div className="pb-top-in">
          <span>WhatsApp: 01644059191</span>
          <span>Location: Room 308</span>
        </div>
      </div>

      <div className="pb-hero-wrap">
        <div className="pb-blob a" />
        <div className="pb-blob b" />
        <div className="pb-blob c" />

        <nav className="pb-nav">
          <div className="pb-logo">
            <span className="pb-logo-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </span>
            PrintingZone
          </div>
          <div className="pb-links">
            <a href="#home">Home</a>
            <a href="#upload">Send Files</a>
            <a href="#rates">Rates</a>
            <a href="#contact">Contact</a>
            <button className="pb-login" onClick={onLogin}>Login</button>
          </div>
        </nav>

        <section className="pb-hero" id="home">
          <div>
            <h1>Printing</h1>
            <div className="pb-zone-row">
              <Badge />
              <h1>Zone</h1>
            </div>
            <p
              style={{
                margin: "20px 0 0",
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                background: "linear-gradient(90deg,#4f3df5,#7c5cff)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Fast, Crisp &amp; Clean Prints.
            </p>
            <p className="pb-lead">
              Send your files online and pick up your prints at Room 308. Assignments, covers,
              question papers, anything. Check your bills and dues anytime by logging in.
            </p>
            <div className="pb-actions">
              <a href="#upload" className="pb-btn">
                Send Files
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </a>
              <span className="pb-pill">
                <span className="pb-dots">
                  <i style={{ background: "#7c5cff" }} />
                  <i style={{ background: "#22c55e" }} />
                  <i style={{ background: "#f59e0b" }} />
                </span>
                Trusted by students
              </span>
            </div>
          </div>

          <div className="pb-art">
            <PrinterArt />
          </div>
        </section>

        <div className="pb-social">
          <a href="https://wa.me/8801644059191" aria-label="WhatsApp">W</a>
        </div>
      </div>

      <div className="pb-feats">
        {FEATS.map(([label, d]) => (
          <div className="pb-feat" key={label}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
            {label}
          </div>
        ))}
      </div>

      <section className="pb-sec" id="upload">
        <div className="pb-upload">
          <div>
            <span className="pb-kicker">Send Files</span>
            <h2>Upload your files</h2>
            <p className="pb-sub">No login needed. Add your name, batch and WhatsApp number, then choose your files.</p>
            <ul className="pb-perks">
              <li>Up to {MAX_MB} MB per file</li>
              <li>PDF, Word, PowerPoint and images accepted</li>
              <li>Your account is created automatically. Your WhatsApp number is your ID and first password</li>
              <li>Always use the same WhatsApp number so we can find your account</li>
            </ul>
          </div>

          <div className="pb-card">
            {state === "done" ? (
              <div className="pb-done">
                <div className="tick">✓</div>
                <h3>Files received!</h3>
                <p style={{ margin: 0, color: "#5d607a" }}>We will print them and keep them ready for you.</p>

                {savedName && savedName !== typedName && (
                  <p style={{ margin: 0, color: "#3b3e5c", fontSize: 14 }}>
                    Your files are saved under the name <b>{savedName}</b>.
                  </p>
                )}

                {account === "created" && (
                  <p style={{ margin: 0, color: "#3b3e5c", fontSize: 14 }}>
                    Your account is ready. Log in with your number <b>{savedNumber}</b>.
                    Your password is the same number. You can change it after logging in.
                  </p>
                )}
                {account === "exists" && (
                  <p style={{ margin: 0, color: "#3b3e5c", fontSize: 14 }}>
                    You already have an account with <b>{savedNumber}</b>. Just log in to see your dues.
                  </p>
                )}
                {account === "failed" && (
                  <p style={{ margin: 0, color: "#e5484d", fontSize: 14 }}>
                    Your files are safe, but we could not create your account right now.
                    We will set it up for you.
                  </p>
                )}

                <button className="pb-btn" onClick={again}>Send more files</button>
              </div>
            ) : (
              <form onSubmit={submit} className="pb-form">
                <label>
                  <span>Name <i>*</i></span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </label>
                <label>
                  <span>Batch <i>*</i></span>
                  <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. 24th" />
                </label>
                <label>
                  <span>WhatsApp Number <i>*</i></span>
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                    inputMode="numeric" placeholder="01XXXXXXXXX" />
                </label>
                <label>
                  <span>Files <i>*</i></span>
                  <input type="file" multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                    onChange={(e) => setFiles(Array.from(e.target.files))} />
                </label>
                {files.length > 0 && (
                  <ul className="pb-files">
                    {files.map((f) => (
                      <li key={f.name}>{f.name} ({(f.size / 1024 / 1024).toFixed(1)} MB)</li>
                    ))}
                  </ul>
                )}
                {error && <p className="pb-error">{error}</p>}
                <button className="pb-btn" disabled={state === "sending"} style={{ justifyContent: "center" }}>
                  {state === "sending" ? "Uploading..." : "Submit Files"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="pb-sec" id="rates">
        <span className="pb-kicker">Pricing</span>
        <h2>Print rates</h2>
        <p className="pb-sub">Price per page.</p>
        <div className="pb-rates">
          {RATES.map(([t, s, p]) => (
            <div className="pb-rate" key={t + s}>
              <span className="pb-rate-t">{t} · {s}</span>
              <div className="pb-rate-p">৳{p}<small>/ page</small></div>
            </div>
          ))}
        </div>

        <h2 style={{ marginTop: 40 }}>Other services</h2>
        <p className="pb-sub">Extra things we do at the counter.</p>
        <div className="pb-rates">
          {SERVICES.map(([t, p]) => (
            <div className="pb-rate" key={t}>
              <span className="pb-rate-t">{t}</span>
              <div className="pb-rate-p">৳{p}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-sec" id="contact">
        <span className="pb-kicker">Contact</span>
        <h2>Find us</h2>
        <p className="pb-sub">Visit us or message us any time.</p>
        <div className="pb-contact">
          <div className="pb-card">
            <h3>Location</h3>
            <p>Room 308</p>
          </div>
          <div className="pb-card">
            <h3>WhatsApp</h3>
            <p><a href="https://wa.me/8801644059191">01644059191</a></p>
          </div>
          <div className="pb-card">
            <h3>Payment (bKash)</h3>
            <p>01816657670</p>
            <small>Please include cashout charge</small>
          </div>
        </div>
      </section>

      <footer className="pb-foot">
        <div className="pb-foot-in">
          <div><b>Printing Zone</b><br />Room 308</div>
          <div>WhatsApp: 01644059191<br />bKash: 01816657670</div>
        </div>
      </footer>
    </div>
  );
}