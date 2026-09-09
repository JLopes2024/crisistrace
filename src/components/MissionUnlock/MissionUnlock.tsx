import {
  useState,
} from "react";

import type {
  AuditLog,
  AuditRecord,
} from "../../types/audit";

import styles from "./MissionUnlock.module.css";

interface MissionUnlockProps {
  investigationId: string;

  unlocked: boolean;

  record:
    | AuditRecord
    | null;

  logs: AuditLog[];

  evidenceSelected: boolean;

  loading: boolean;

  onUnlock: (
    code: string,
  ) => Promise<void>;

  onEvidenceToggle:
    () => Promise<void>;
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

function MissionUnlock({
  unlocked,
  record,
  logs,
  evidenceSelected,
  loading,
  onUnlock,
  onEvidenceToggle,
}: MissionUnlockProps) {
  const [
    code,
    setCode,
  ] = useState("");

  const [
    unlocking,
    setUnlocking,
  ] = useState(false);

  const [
    changingEvidence,
    setChangingEvidence,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    dossierOpen,
    setDossierOpen,
  ] = useState(false);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !code.trim() ||
      unlocking
    ) {
      return;
    }

    try {
      setUnlocking(true);
      setError("");

      await onUnlock(
        code.trim(),
      );

      setCode("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível ativar a missão.",
      );
    } finally {
      setUnlocking(false);
    }
  }

  async function handleEvidence() {
    if (
      changingEvidence
    ) {
      return;
    }

    try {
      setChangingEvidence(
        true,
      );

      setError("");

      await onEvidenceToggle();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a evidência.",
      );
    } finally {
      setChangingEvidence(
        false,
      );
    }
  }

  if (
    loading
  ) {
    return (
      <section
        className={
          styles.mission
        }
      >
        <div
          className={
            styles.loading
          }
        >
          Consultando protocolo restrito...
        </div>
      </section>
    );
  }

  if (
    !unlocked ||
    !record
  ) {
    return (
      <section
        className={`${styles.mission} ${styles.locked}`}
      >
        <div
          className={
            styles.lockedCode
          }
        >
          <span>
            AUD-015
          </span>

          <strong>
            RESTRITO
          </strong>
        </div>

        <div
          className={
            styles.lockedBody
          }
        >
          <span
            className={
              styles.eyebrow
            }
          >
            MISSÃO 07
          </span>

          <h3>
            Operação Escudo Imprevisto
          </h3>

          <p>
            Um novo evento foi detectado durante o monitoramento.
            O conteúdo está protegido pelo protocolo de contenção.
          </p>

          <div
            className={
              styles.restrictedMeta
            }
          >
            <span>
              ORIGEM
              <strong>
                CONFIDENCIAL
              </strong>
            </span>

            <span>
              AUTOR
              <strong>
                BLOQUEADO
              </strong>
            </span>

            <span>
              RISCO
              <strong>
                BLOQUEADO
              </strong>
            </span>

            <span>
              HORÁRIO
              <strong>
                BLOQUEADO
              </strong>
            </span>
          </div>

          <form
            className={
              styles.unlockForm
            }
            onSubmit={
              handleSubmit
            }
          >
            <label>
              <span>
                Código do protocolo
              </span>

              <input
                type="password"
                value={code}
                autoComplete="off"
                placeholder="Digite o código"
                disabled={
                  unlocking
                }
                onChange={(
                  event,
                ) =>
                  setCode(
                    event.target.value,
                  )
                }
              />
            </label>

            <button
              type="submit"
              disabled={
                unlocking ||
                !code.trim()
              }
            >
              {unlocking
                ? "Ativando..."
                : "Ativar protocolo"}
            </button>
          </form>

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
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${styles.mission} ${styles.unlocked}`}
    >
      <div
        className={
          styles.recordCode
        }
      >
        <span>
          {
            record.record_code
          }
        </span>

        <strong>
          CRÍTICO
        </strong>
      </div>

      <div
        className={
          styles.recordBody
        }
      >
        <div
          className={
            styles.alert
          }
        >
          <span>
            MISSÃO 07 ATIVADA
          </span>

          <strong>
            OPERAÇÃO ESCUDO IMPREVISTO
          </strong>
        </div>

        <div
          className={
            styles.heading
          }
        >
          <div>
            <h3>
              {record.title}
            </h3>

            <p>
              {record.platform ||
                "Origem não identificada"}

              {record.author &&
                ` • ${record.author}`}
            </p>
          </div>

          <span
            className={
              styles.recovered
            }
          >
            RECUPERADO
          </span>
        </div>

        {record.preview && (
          <p
            className={
              styles.preview
            }
          >
            {record.preview}
          </p>
        )}

        {record.content && (
          <blockquote>
            {record.content}
          </blockquote>
        )}

        <div
          className={
            styles.actions
          }
        >
          <button
            type="button"
            className={
              styles.dossierButton
            }
            onClick={() =>
              setDossierOpen(
                (current) =>
                  !current,
              )
            }
          >
            {dossierOpen
              ? "Fechar dossiê"
              : "Abrir dossiê"}
          </button>

          <button
            type="button"
            className={
              evidenceSelected
                ? styles.selectedButton
                : styles.evidenceButton
            }
            disabled={
              changingEvidence
            }
            onClick={
              handleEvidence
            }
          >
            {changingEvidence
              ? "Salvando..."
              : evidenceSelected
                ? "✓ Evidência selecionada"
                : "+ Adicionar às evidências"}
          </button>
        </div>

        {dossierOpen && (
          <div
            className={
              styles.dossier
            }
          >
            <div
              className={
                styles.dossierHeader
              }
            >
              <div>
                <span>
                  DOSSIÊ RESTRITO
                </span>

                <h4>
                  Linha do tempo do incidente
                </h4>
              </div>

              <strong>
                MISSÃO 07
              </strong>
            </div>

            <dl
              className={
                styles.details
              }
            >
              <div>
                <dt>
                  Ocorrência
                </dt>

                <dd>
                  {formatDate(
                    record.occurred_at,
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Confiança
                </dt>

                <dd>
                  {record.confidence ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>
                  Motivo
                </dt>

                <dd>
                  {record.reason ||
                    "—"}
                </dd>
              </div>

              <div>
                <dt>
                  Nota de auditoria
                </dt>

                <dd>
                  {record.audit_note ||
                    "—"}
                </dd>
              </div>
            </dl>

            <div
              className={
                styles.timeline
              }
            >
              {logs.length ===
              0 ? (
                <p>
                  Nenhum log disponível.
                </p>
              ) : (
                logs.map(
                  (log) => (
                    <div
                      key={
                        log.id
                      }
                      className={
                        styles.timelineItem
                      }
                    >
                      <time>
                        {formatDate(
                          log.occurred_at,
                        )}
                      </time>

                      <span>
                        {
                          log.description
                        }
                      </span>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        )}

        <footer
          className={
            styles.footer
          }
        >
          <div
            className={
              styles.tags
            }
          >
            {record.tags.map(
              (tag) => (
                <span key={tag}>
                  {tag}
                </span>
              ),
            )}
          </div>

          <time>
            {formatDate(
              record.occurred_at,
            )}
          </time>
        </footer>

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
      </div>
    </section>
  );
}

export default MissionUnlock;