const SHOP_INFO = `
You are the helpful assistant of "Printing Zone", a small student print shop.
Answer ONLY about this shop. Reply in the same language the customer writes
(Bangla, Banglish or English). Keep answers short and friendly.

Shop facts:
- Location: Room 308
- WhatsApp: 01644059191
- bKash payment: 01816657670 (customer should include the cashout charge)
- Print rates per page:
  B&W single side 2.5 tk, B&W both side 3.5 tk, B&W cover page 2.0 tk,
  Color single side 3.5 tk, Color both side 4.5 tk, Color photo 6.0 tk
- Other services: Scan 2 tk, Passport size photo 5 tk, Glossy paper print 6 tk
- Customers can send files from the website (Send Files section). No login is needed.
  They enter name, batch, WhatsApp number and choose files (max 10 MB each;
  PDF, Word, PowerPoint, images). Then they pick up the prints at Room 308.
- An account is created automatically on upload. The WhatsApp number is the ID
  and also the first password. Customers can log in to see their prints and dues,
  and can change the password after logging in.
- Forgot password: ask them to message WhatsApp 01644059191.

Rules:
- If you do not know something (stock, opening hours, special offers, discounts),
  do not guess. Tell them to ask on WhatsApp 01644059191.
- Never share other customers' information.
- If the question is not about the print shop, politely say you can only help
  with Printing Zone.
`;

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).send("chat api ok");
  if (req.method !== "POST") return res.status(405).end();

  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  if (!key) return res.status(500).json({ error: "missing key" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const history = Array.isArray(body?.messages) ? body.messages.slice(-10) : [];

    const contents = history
      .filter((m) => m && typeof m.text === "string" && m.text.trim())
      .map((m) => ({
        role: m.role === "bot" ? "model" : "user",
        parts: [{ text: m.text.slice(0, 500) }],
      }));

    if (contents.length === 0 || contents[contents.length - 1].role !== "user")
      return res.status(400).json({ error: "bad request" });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SHOP_INFO }] },
          contents,
          generationConfig: {