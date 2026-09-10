import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

type Destination =
  | "/login"
  | "/session"
  | "/dashboard"
  | null;

function InitialRedirect() {
  const [
    destination,
    setDestination,
  ] =
    useState<Destination>(
      null,
    );

  useEffect(() => {
    let active = true;

    async function resolveDestination() {
      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (
          !session?.user.email
        ) {
          setDestination(
            "/login",
          );

          return;
        }

        const roomCode =
          session.user.email
            .split("@")[0]
            .toUpperCase();

        if (
          roomCode ===
          "PROFESSORES"
        ) {
          setDestination(
            "/dashboard",
          );

          return;
        }

        const sessionId =
          sessionStorage.getItem(
            "crisistrace_session_id",
          );

        setDestination(
          sessionId
            ? "/dashboard"
            : "/session",
        );
      } catch (error) {
        console.error(
          "Erro ao verificar sessão:",
          error,
        );

        if (active) {
          setDestination(
            "/login",
          );
        }
      }
    }

    resolveDestination();

    return () => {
      active = false;
    };
  }, []);

  if (!destination) {
    return (
      <main
        style={{
          minHeight:
            "100vh",
          display: "grid",
          placeItems:
            "center",
          background:
            "#07192d",
          color:
            "#eef5fb",
        }}
      >
        Verificando acesso...
      </main>
    );
  }

  return (
    <Navigate
      to={destination}
      replace
    />
  );
}

export default InitialRedirect;
