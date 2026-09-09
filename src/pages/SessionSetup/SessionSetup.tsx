import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  startClassroomSession,
} from "../../lib/classroomSession";

import type {
  ClassroomPeriod,
} from "../../lib/classroomSession";

import { supabase } from "../../lib/supabase";

import styles from "./SessionSetup.module.css";

const groups = Array.from(
  { length: 10 },
  (_, index) => index + 1,
);

function SessionSetup() {
  const navigate =
    useNavigate();

  const [
    roomCode,
    setRoomCode,
  ] = useState("");

  const [
    period,
    setPeriod,
  ] =
    useState<ClassroomPeriod | null>(
      null,
    );

  const [
    groupNumber,
    setGroupNumber,
  ] =
    useState<number | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    checking,
    setChecking,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function prepare() {
      try {
        const {
          data: { user },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (!active) {
          return;
        }

        if (
          userError ||
          !user?.email
        ) {
          navigate(
            "/login",
            {
              replace: true,
            },
          );

          return;
        }

        const code =
          user.email
            .split("@")[0]
            .toUpperCase();

        if (
          code ===
          "PROFESSORES"
        ) {
          navigate(
            "/dashboard",
            {
              replace: true,
            },
          );

          return;
        }

        setRoomCode(code);
      } catch (error) {
        console.error(
          "Erro ao identificar sala:",
          error,
        );

        if (active) {
          setError(
            "Não foi possível identificar a sala.",
          );
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    }

    prepare();

    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleStart() {
    if (
      !period ||
      !groupNumber ||
      loading
    ) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result =
        await startClassroomSession(
          period,
          groupNumber,
        );

      if (!result.success) {
        setError(
          result.message ||
            "Não foi possível iniciar a investigação.",
        );

        return;
      }

      if (!result.session?.id) {
        setError(
          "A sessão foi criada, mas não retornou uma identificação válida.",
        );

        return;
      }

      sessionStorage.setItem(
        "crisistrace_session_id",
        result.session.id,
      );

      navigate(
        "/dashboard",
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Erro ao iniciar investigação:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a investigação.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    sessionStorage.removeItem(
      "crisistrace_session_id",
    );

    await supabase.auth.signOut();

    navigate(
      "/login",
      {
        replace: true,
      },
    );
  }

  function selectPeriod(
    value: ClassroomPeriod,
  ) {
    if (loading) {
      return;
    }

    setPeriod(value);
    setError("");
  }

  function selectGroup(
    value: number,
  ) {
    if (loading) {
      return;
    }

    setGroupNumber(value);
    setError("");
  }

  if (checking) {
    return (
      <main
        className={
          styles.statePage
        }
      >
        <div
          className={
            styles.loader
          }
        />

        <strong>
          Identificando sala...
        </strong>
      </main>
    );
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <section
        className={
          styles.card
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div
            className={
              styles.brand
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

              <strong>
                CrisisTrace
              </strong>
            </div>
          </div>

          <button
            type="button"
            className={
              styles.logout
            }
            onClick={
              handleLogout
            }
            disabled={loading}
          >
            Sair
          </button>
        </header>

        <div
          className={
            styles.content
          }
        >
          <div
            className={
              styles.room
            }
          >
            <span>
              SALA IDENTIFICADA
            </span>

            <strong>
              {roomCode}
            </strong>
          </div>

          <div
            className={
              styles.intro
            }
          >
            <span>
              IDENTIFICAÇÃO DA EQUIPE
            </span>

            <h1>
              Prepare sua investigação
            </h1>

            <p>
              Selecione o período e o
              grupo responsável por
              esta sessão. Cada início
              cria uma investigação
              independente.
            </p>
          </div>

          <section
            className={
              styles.step
            }
          >
            <div
              className={
                styles.stepHeader
              }
            >
              <span>
                ETAPA 01
              </span>

              <strong>
                Período
              </strong>
            </div>

            <div
              className={
                styles.periodGrid
              }
            >
              <button
                type="button"
                disabled={loading}
                aria-pressed={
                  period ===
                  "morning"
                }
                className={
                  period ===
                  "morning"
                    ? styles.selectedOption
                    : styles.option
                }
                onClick={() =>
                  selectPeriod(
                    "morning",
                  )
                }
              >
                <span>
                  MANHÃ
                </span>

                <strong>
                  08:00 — 12:00
                </strong>
              </button>

              <button
                type="button"
                disabled={loading}
                aria-pressed={
                  period ===
                  "afternoon"
                }
                className={
                  period ===
                  "afternoon"
                    ? styles.selectedOption
                    : styles.option
                }
                onClick={() =>
                  selectPeriod(
                    "afternoon",
                  )
                }
              >
                <span>
                  TARDE
                </span>

                <strong>
                  13:00 — 17:00
                </strong>
              </button>
            </div>
          </section>

          <section
            className={
              styles.step
            }
          >
            <div
              className={
                styles.stepHeader
              }
            >
              <span>
                ETAPA 02
              </span>

              <strong>
                Grupo
              </strong>
            </div>

            <div
              className={
                styles.groupGrid
              }
            >
              {groups.map(
                (group) => (
                  <button
                    key={group}
                    type="button"
                    disabled={
                      loading
                    }
                    aria-pressed={
                      groupNumber ===
                      group
                    }
                    className={
                      groupNumber ===
                      group
                        ? styles.selectedGroup
                        : styles.group
                    }
                    onClick={() =>
                      selectGroup(
                        group,
                      )
                    }
                  >
                    <span>
                      GRUPO
                    </span>

                    <strong>
                      {group}
                    </strong>
                  </button>
                ),
              )}
            </div>
          </section>

          {error && (
            <div
              className={
                styles.error
              }
              role="alert"
            >
              <strong>
                Não foi possível iniciar
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}

          <div
            className={
              styles.summary
            }
          >
            <div>
              <span>
                IDENTIFICAÇÃO
              </span>

              <strong>
                Sala {roomCode}
                {" • "}
                {period ===
                "morning"
                  ? "Manhã"
                  : period ===
                      "afternoon"
                    ? "Tarde"
                    : "Período não selecionado"}
                {" • "}
                {groupNumber
                  ? `Grupo ${groupNumber}`
                  : "Grupo não selecionado"}
              </strong>
            </div>

            <button
              type="button"
              className={
                styles.start
              }
              disabled={
                !period ||
                !groupNumber ||
                loading
              }
              onClick={
                handleStart
              }
            >
              {loading
                ? "Iniciando..."
                : "Iniciar investigação →"}
            </button>
          </div>
        </div>

        <footer
          className={
            styles.footer
          }
        >
          <span>
            OPERAÇÃO RAIO-X DE
            REPUTAÇÃO
          </span>

          <strong>
            AMBIENTE CONTROLADO
          </strong>
        </footer>
      </section>
    </main>
  );
}

export default SessionSetup;