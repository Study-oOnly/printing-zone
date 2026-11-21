import { useRef } from "react";
import { toJpeg } from "html-to-image";

export default function CustomerReceipt({ entries, customerName, onClose }) {
  const ref = useRef(null);

  const unpaid = entries
    .filter((e) => e.status === "Unpaid")
    .slice()
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

  const total = unpaid.reduce((s, e) => s + (e.totalCost || 0), 0);

  function fileDate() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  }

  async function download() {
    const url = await toJpeg(ref.current, {
      quality: 0.95,
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customerName}_${fileDate()}.jpg`;
    a.click();
  }

  return (
    <div className="modal-bg">
      <div className="modal">
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
          <div className="r-row r-bold r-big"><span>TOTAL</span><span>৳{total}</span></div>
          <div className="r-dash" />
          <div className="r-center">Bkash: 01816657670</div>
          <div className="r-center">Please include cashout charge for bKash</div>
          <div className="r-dash" />
          <div className="r-center">Thank you for choosing us! Visit us again for all your printing needs.</div>
        </div>

        <div className="actions">
          <button className="green" onClick={download}>Download as JPG</button>
          <button className="gray" onClick={onClose}>বন্ধ করুন</button>
        </div>
      </div>
    </div>
  );
}