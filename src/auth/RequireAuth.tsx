import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

export default RequireAuth;
