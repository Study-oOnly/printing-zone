import { useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import { sameName } from "../utils/names";

export default function Receipt({ entries, customerName, phone, onClose }) {
  const ref = useRef(null);
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");

  const unpaid = entries
    .filter((e) => sameName(e.customerName, customerName) && e.status === "Unpaid")
    .slice()
    .reverse();

  const subtotal = unpaid.reduce((s, e) => s + (e.totalCost || 0), 0);
  const disc = Number(discount) || 0;
  const total = subtotal - disc;

  function fileDate() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  }

  const fileName = () => `${customerName}_${fileDate()}.jpg`;

  async function makeDataUrl() {
    return toJpeg(ref.current, {
      quality: 0.95,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
  }

  function saveUrl(url) {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName();
    a.click();
  }

  async function download() {
    saveUrl(await makeDataUrl());
  }

  // Share the image: opens the share sheet on phones, otherwise downloads it
  async function shareImage() {
    setNote("");
    try {
      const url = await makeDataUrl();
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], fileName(), { type: "image/jpeg" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Printing Zone Bill",
        });
      } else {
        saveUrl(url);
        setNote("Direct sharing is not supported on this device. The image was downloaded, please attach it in WhatsApp manually.");
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.error(err);
      setNote("Could not share. Please use Download as JPG.");
    }
  }

  // Share text: opens WhatsApp with the customer's number and a ready message
  function shareText() {
    const lines = [];
    lines.push("*PRINTING ZONE*");
    lines.push("Room: 308");
    lines.push("");
    lines.push(`CUSTOMER: ${customerName}`);
    lines.push("------------------------");
    unpaid.forEach((e, i) => {
      const pg = e.pages > 0 ? ` ${e.pages}p (${e.printType})` : "";
      const docName = e.documentName ? ` - ${e.documentName}` : "";
      lines.push(`${i + 1}. ${e.date}${pg}${docName} = ৳${e.totalCost}`);
    });
    lines.push("------------------------");
    lines.push(`Subtotal: ৳${subtotal}`);
    if (disc > 0) lines.push(`Discount: -৳${disc}`);
    lines.push(`*TOTAL: ৳${total}*`);
    lines.push("");
    lines.push("Bkash: 01816657670");
    lines.push("Please include cashout charge for bKash");
    lines.push("");
    lines.push("Thank you for choosing us! Visit us again for all your printing needs.");

    const text = encodeURIComponent(lines.join("\n"));
    const num = phone ? `88${phone.replace(/\D/g, "")}` : "";
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
  }

  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="modal-top">
          <label>Discount (TK)</label>
          <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>

        <div className="receipt" ref={ref}>
          <div className="r-center r-bold r-big">PRINTING ZONE</div>
          <div className="r-center">Room: 308</div>
          <div className="r-center">WhatsApp: 01644059191</div>
          <div className="r-dash" />
          <div>CUSTOMER: {customerName}</div>
          <div className="r-dash" />
          {unpaid.map((e, i) => (
            <div key={e.id} className="r-item">
              <div className="r-row">
                <span>
                  {i + 1}. {e.date} {e.pages > 0 ? `${e.pages}p (${e.printType})` : ""}
                </span>
                <span>৳{e.totalCost}</span>
              </div>
              {e.documentName && <div className="r-doc">- {e.documentName}</div>}
            </div>
          ))}
          <div className="r-dash" />
          <div className="r-row"><span>Subtotal</span><span>৳{subtotal}</span></div>
          {disc > 0 && <div className="r-row"><span>Discount</span><span>-৳{disc}</span></div>}
          <div className="r-row r-bold r-big"><span>TOTAL</span><span>৳{total}</span></div>
          <div className="r-dash" />
          <div className="r-center">Bkash: 01816657670</div>
          <div className="r-center">Please include cashout charge for bKash</div>
          <div className="r-dash" />
          <div className="r-center">Thank you for choosing us! Visit us again for all your printing needs.</div>
        </div>

        {note && <p style={{ fontSize: 13, marginTop: 10 }}>{note}</p>}

        <div className="actions">
          <button className="green" onClick={download}>Download as JPG</button>
          <button onClick={shareImage}>Share Image</button>
          <button onClick={shareText}>Share Text</button>
          <button className="gray" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}