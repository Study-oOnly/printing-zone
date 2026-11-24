import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { secondaryAuth, secondaryDb } from "../firebase";
import { nameKey } from "./names";

export function isValidPhone(n) {
  return /^01\d{9}$/.test((n || "").trim());
}

async function tryClaim(database, name, num) {
  try {
    await setDoc(doc(database, "names", nameKey(name)), { name, whatsapp: num });
    return "ok";
  } catch (err) {
    if (err && err.code === "permission-denied") return "taken";
    console.error(err);
    return "error";
  }
}

// Finds the saved name for this WhatsApp number, or picks a unique one.
// Returns { ok: true, name, existing } or { ok: false }
export async function resolveIdentity(database, name, whatsapp) {
  const num = (whatsapp || "").trim();
  const typed = (name || "").trim().replace(/\s+/g, " ");
  if (!typed || !isValidPhone(num)) return { ok: false };

  // 1. This number was used before: keep the name saved back then
  try {
    const snap = await getDoc(doc(database, "phones", num));
    if (snap.exists()) return { ok: true, name: snap.data().name, existing: true };
  } catch (err) {
    console.error(err);
    return { ok: false };
  }

  // 2. New number: use the typed name. If someone else has it, add the last 4 digits.
  const candidates = [typed, `${typed} ${num.slice(-4)}`, `${typed} ${num}`];
  for (const c of candidates) {
    const r = await tryClaim(database, c, num);
    if (r === "ok") {
      try {
        await setDoc(doc(database, "phones", num), { name: c });
      } catch (err) {
        console.error(err);
        return { ok: false };
      }
      return { ok: true, name: c, existing: false };
    }
    if (r === "error") return { ok: false };
  }
  return { ok: false };
}

// Returns { status: "created" | "exists" | "invalid" | "error", name }
export async function createCustomerAccount({ name, batch, whatsapp }) {
  const num = (whatsapp || "").trim();
  if (!isValidPhone(num) || !(name || "").trim()) return { status: "invalid" };

  const id = await resolveIdentity(secondaryDb, name, num);
  if (!id.ok) return { status: "error" };

  try {
    // Default password is the WhatsApp number itself
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      `${num}@printingzone.app`,
      num
    );
    await setDoc(doc(secondaryDb, "customers", cred.user.uid), {
      name: id.name,
      batch: (batch || "").trim(),
      whatsapp: num,
    });
    await signOut(secondaryAuth);
    return { status: "created", name: id.name };
  } catch (err) {
    try { await signOut(secondaryAuth); } catch (e) { /* ignore */ }
    if (err && err.code === "auth/email-already-in-use")
      return { status: "exists", name: id.name };
    console.error(err);
    return { status: "error" };
  }
}