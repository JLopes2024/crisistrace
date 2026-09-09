import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Outlet,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

function ProtectedRoute() {
  const [loading, setLoading] =
    useState(true);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!active) {
        return;
      }

      setAuthenticated(
        Boolean(session),
      );

      setLoading(false);
    }

    checkSession();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!active) {
            return;
          }

          setAuthenticated(
            Boolean(session),
          );

          setLoading(false);
        },
      );

    return () => {
      active = false;

      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        Carregando...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;