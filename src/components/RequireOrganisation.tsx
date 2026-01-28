import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { apiService } from "../services/api";

const RequireOrganisation: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  const [hasOrganisation, setHasOrganisation] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkOrganisation = async () => {
      try {
        await apiService.getOrganisation();
        setHasOrganisation(true);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("NO_ORGANISATION") ||
          errorMessage.includes("404") ||
          errorMessage.includes("No organisation found")
        ) {
          setHasOrganisation(false);
        } else {
          console.error("Error checking organisation:", err);
          setHasOrganisation(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkOrganisation();
  }, [user]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Laddar...</div>;
  }

  if (!hasOrganisation) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
};

export default RequireOrganisation;
