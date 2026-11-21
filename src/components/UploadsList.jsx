import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function UploadsList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "uploads"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => console.error(e)
    );
  }, []);

  const time = (t) => (t?.toDate ? t.toDate().toLocaleString("en-GB") : "");
  const wa = (n) => `https://wa.me/88${n}`;

  return (
    <div className="card">
      <h2>কাস্টমারের পাঠানো ফাইল ({items.length})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>সময়</th><th>নাম</th><th>ব্যাচ</th><th>WhatsApp</th><th>ফাইল</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{time(u.createdAt)}</td>
                <td>{u.name}</td>
                <td>{u.batch}</td>
                <td>{u.whatsapp ? <a href={wa(u.whatsapp)} target="_blank" rel="noreferrer">{u.whatsapp}</a> : "-"}</td>
                <td><a href={u.fileUrl} target="_blank" rel="noreferrer">{u.fileName}</a></td>
                <td>
                  <button className="red" onClick={() => confirm("মুছবেন?") && deleteDoc(doc(db, "uploads", u.id))}>
                    মুছুন
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}