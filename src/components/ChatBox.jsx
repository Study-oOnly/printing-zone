import { useState, useRef, useEffect } from "react";

const GREETING =
  "হ্যালো! আমি Printing Zone-এর AI সহকারী। রেট, ফাইল পাঠানো, পেমেন্ট বা পিকআপ নিয়ে প্রশ্ন করতে পারো।";

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, open]);

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: "user", text: t }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      if (!r.ok || !d.reply) throw new Error("bad reply");
      setMsgs([...next, { role: "bot", text: d.reply }]);
    } catch (err) {
      setMsgs([
        ...next,
        { role: "bot", text: "দুঃখিত, এখন উত্তর দিতে পারছি না। WhatsApp-এ জানাও: 01644059191" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{`
        .pbchat-btn { position:fixed; right:18px; bottom:18px; z-index:60; width:58px; height:58px; border-radius:50%; border:none; cursor:pointer; font-size:26px; color:#fff; background:linear-gradient(135deg,var(--brand,#4f3df5),var(--brand2,#7b5cff)); box-shadow:0 10px 24px rgba(79,61,245,.35); }
        .pbchat-box { position:fixed; right:18px; bottom:88px; z-index:60; width:min(360px,calc(100vw - 24px)); height:min(480px,calc(100vh - 120px)); background:#fff; border:1.5px solid #e5e5ee; border-radius:18px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 18px 40px rgba(0,0,0,.18); font-family:inherit; }
        .pbchat-head { padding:14px 16px; color:#fff; font-weight:700; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg,var(--brand,#4f3df5),var(--brand2,#7b5cff)); }
        .pbchat-x { background:none; border:none; color:#fff; font-size:20px; cursor:pointer; }
        .pbchat-msgs { flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; }
        .pbchat-m { max-width:85%; padding:9px 12px; border-radius:14px; font-size:14.5px; line-height:1.45; white-space:pre-wrap; word-break:break-word; }
        .pbchat-m.bot { align-self:flex-start; background:#f1f1f7; color:#222; }
        .pbchat-m.user { align-self:flex-end; background:var(--brand,#4f3df5); color:#fff; }
        .pbchat-form { display:flex; gap:8px; padding:10px; border-top:1px solid #eee; }
        .pbchat-in { flex:1; padding:10px 12px; border:1.5px solid #ddd; border-radius:12px; font-size:15px; font-family:inherit; }
        .pbchat-send { padding:0 16px; border:none; border-radius:12px; color:#fff; font-weight:700; cursor:pointer; background:var(--brand,#4f3df5); }
        .pbchat-send:disabled { opacity:.5; cursor:default; }
      `}</style>

      {open && (
        <div className="pbchat-box">
          <div className="pbchat-head">
            <span>Printing Zone Assistant</span>
            <button className="pbchat-x" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="pbchat-msgs">
            <div className="pbchat-m bot">{GREETING}</div>
            {msgs.map((m, i) => (
              <div key={i} className={"pbchat-m " + m.role}>{m.text}</div>
            ))}
            {busy && <div className="pbchat-m bot">লিখছি...</div>}
            <div ref={endRef} />
          </div>
          <form className="pbchat-form" onSubmit={send}>
            <input
              className="pbchat-in"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="প্রশ্ন লেখো..."
              maxLength={300}
            />
            <button className="pbchat-send" disabled={busy || !text.trim()}>Send</button>
          </form>
        </div>
      )}

      <button className="pbchat-btn" onClick={() => setOpen(!open)} aria-label="Chat">
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}