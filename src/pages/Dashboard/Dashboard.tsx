import React, { useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

const DashboardPage: React.FC = () => {
  const [me, setMe] = useState<{ id: number; email: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Inte inloggad");
        setMe(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel");
      }
    })();
  }, []);

  if (error) return <p style={{ padding: "1rem" }}>{error}</p>;
  if (!me) return <p style={{ padding: "1rem" }}>Laddar...</p>;

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Välkommen, {me.name}</h2>
      <p>{me.email}</p>
    </div>
  );
};

export default DashboardPage;
