import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { apiService } from "../services/api";

export const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  const [isCaretaker, setIsCaretaker] = useState<boolean | null>(null);
  const [hasOrganisation, setHasOrganisation] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      try {
        await apiService.getOrganisation();
        setHasOrganisation(true);
        setIsCaretaker(true);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (
          errorMessage.includes("NO_ORGANISATION") ||
          errorMessage.includes("404") ||
          errorMessage.includes("No organisation found")
        ) {
          setHasOrganisation(false);
          setIsCaretaker(false);
        } else {
          console.error("Error checking organisation:", err);
          setHasOrganisation(false);
          setIsCaretaker(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, [user]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Laddar...</div>;
  }

  if (!hasOrganisation) {
    return <Navigate to="/onboarding" replace />;
  }

  if (isCaretaker) {
    return <Navigate to="/caregiver-dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
