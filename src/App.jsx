import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, ADMIN_UID } from "./firebase";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Customer from "./pages/Customer";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) setView("home");
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f1f3fd", fontFamily: "'Plus Jakarta Sans', Arial, sans-serif", color: "#5d607a", fontWeight: 600 }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return view === "login"
      ? <Login onBack={() => setView("home")} />
      : <Home onLogin={() => setView("login")} />;
  }

  if (user.uid === ADMIN_UID) return <Admin />;

  return <Customer user={user} />;
}