import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import AccessLoading from "@/components/permissions/AccessLoading";
import { OPEN_PAGES, SIGN_IN_PAGES } from "./audience";

/**
 * Visitors who aren't signed in only get the landing page. A personal link
 * (event invitation, catering portal) asks them to sign in, then opens.
 */
export default function VisitorGate({ pageName, children }) {
  const { isAuthenticated } = useAuth();
  const askSignIn = !isAuthenticated && SIGN_IN_PAGES.includes(pageName);

  useEffect(() => {
    if (askSignIn) base44.auth.redirectToLogin(window.location.href);
  }, [askSignIn]);

  if (isAuthenticated || OPEN_PAGES.includes(pageName)) return children;
  if (askSignIn) return <AccessLoading className="min-h-screen" />;
  return <Navigate to="/" replace />;
}