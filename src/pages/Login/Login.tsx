import {
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";

import {
  useNavigate,
} from "react-router-dom";

import { supabase } from "../../lib/supabase";

import styles from "./Login.module.css";

const validRooms = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "PROFESSORES",
];

function getDestination(
  email: string,
) {
  const code =
    email
      .split("@")[0]
      .toUpperCase();

  return code ===
    "PROFESSORES"
    ? "/dashboard"
    : "/session";
}

function Login() {
  const navigate =
    useNavigate();

  const [
    roomCode,
    setRoomCode,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (
        !active ||
        !session?.user.email
      ) {
        return;
      }

      navigate(
        getDestination(
          session.user.email,
        ),
        {
          replace: true,
        },
      );
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedCode =
      roomCode
        .trim()
        .toUpperCase();

    setError("");

    if (
      !validRooms.includes(
        normalizedCode,
      )
    ) {
      setError(
        "Informe uma sala de A a G ou PROFESSORES.",
      );

      return;
    }

    if (!password) {
      setError(
        "Informe a senha.",
      );

      return;
    }

    const email =
      `${normalizedCode.toLowerCase()}@renapsisp.org`;

    try {
      setLoading(true);

      const {
        data,
        error: signInError,
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

      if (
        signInError ||
        !data.user
      ) {
        setError(
          "Código ou senha incorretos.",
        );

        return;
      }

      sessionStorage.removeItem(
        "crisistrace_session_id",
      );

      navigate(
        normalizedCode ===
          "PROFESSORES"
          ? "/dashboard"
          : "/session",
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(error);

      setError(
        "Não foi possível realizar o login.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={styles.page}
    >
      <section
        className={
          styles.loginCard
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div
            className={
              styles.logo
            }
          >
            CT
          </div>

          <div>
            <span>
              DIGITAL REPUTATION
              INTELLIGENCE
            </span>

            <h1>
              CrisisTrace
            </h1>
          </div>
        </header>

        <div
          className={
            styles.intro
          }
        >
          <span>
            ACESSO RESTRITO
          </span>

          <h2>
            Identificação da Sala
          </h2>

          <p>
            Utilize o código e a senha
            fornecidos para acessar a
            investigação.
          </p>
        </div>

        <form
          className={
            styles.form
          }
          onSubmit={
            handleSubmit
          }
        >
          <label>
            <span>
              Código da sala
            </span>

            <input
              type="text"
              value={roomCode}
              autoComplete="username"
              autoCapitalize="characters"
              placeholder="A"
              disabled={loading}
              onChange={(event) => {
                setRoomCode(
                  event.target.value,
                );

                setError("");
              }}
            />

            <small>
              Salas A–G ou
              PROFESSORES
            </small>
          </label>

          <label>
            <span>
              Senha
            </span>

            <input
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="Digite a senha"
              disabled={loading}
              onChange={(event) => {
                setPassword(
                  event.target.value,
                );

                setError("");
              }}
            />
          </label>

          {error && (
            <div
              className={
                styles.error
              }
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className={
              styles.submit
            }
            disabled={loading}
          >
            {loading
              ? "Autenticando..."
              : "Acessar investigação"}
          </button>
        </form>

        <footer
          className={
            styles.footer
          }
        >
          <span>
            AMBIENTE DE AUDITORIA
            DIGITAL
          </span>

          <strong>
            OPERAÇÃO RAIO-X
          </strong>
        </footer>
      </section>
    </main>
  );
}

export default Login;