import {
  useEffect,
  useState,
} from "react";

import { getAuditLogs } from "../../lib/audit";

import type {
  AuditLog,
  AuditRecord,
  ConfidenceLevel,
} from "../../types/audit";

import styles from "./AuditDossier.module.css";

type AuditDossierProps = {
  record: AuditRecord;
  selected: boolean;
  changing: boolean;
  onEvidenceToggle: () => void;
  onClose: () => void;
};

const confidenceLabels: Record<
  ConfidenceLevel,
  string
> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function formatDate(
  date: string | null,
) {
  if (!date) {
    return "Horário não registrado";
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
  ).format(new Date(date));
}

function AuditDossier({
  record,
  selected,
  changing,
  onEvidenceToggle,
  onClose,
}: AuditDossierProps) {
  const [logs, setLogs] = useState<
    AuditLog[]
  >([]);

  const [
    loadingLogs,
    setLoadingLogs,
  ] = useState(true);

  const [logError, setLogError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      try {
        setLoadingLogs(true);
        setLogError("");

        const data =
          await getAuditLogs(
            record.id,
          );

        if (active) {
          setLogs(data);
        }
      } catch (error) {
        console.error(
          "Erro ao carregar logs:",
          error,
        );

        if (active) {
          setLogError(
            "Não foi possível consultar o histórico.",
          );
        }
      } finally {
        if (active) {
          setLoadingLogs(false);
        }
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, [record.id]);

  return (
    <div className={styles.dossier}>
      <div className={styles.header}>
        <div>
          <span>DOSSIÊ DIGITAL</span>
          <h4>{record.record_code}</h4>
        </div>

        <button
          type="button"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>

      <div className={styles.grid}>
        <section>
          <span className={styles.label}>
            Ocorrência
          </span>

          <strong>
            {formatDate(
              record.occurred_at,
            )}
          </strong>
        </section>

        <section>
          <span className={styles.label}>
            Plataforma
          </span>

          <strong>
            {record.platform ||
              "Não identificada"}
          </strong>
        </section>

        <section>
          <span className={styles.label}>
            Autor / origem
          </span>

          <strong>
            {record.author ||
              "Não identificado"}
          </strong>
        </section>

        <section>
          <span className={styles.label}>
            Confiança
          </span>

          <strong>
            {record.confidence
              ? confidenceLabels[
                  record.confidence
                ]
              : "Não classificada"}
          </strong>
        </section>
      </div>

      <div className={styles.analysis}>
        <section>
          <span className={styles.label}>
            Motivo do registro
          </span>

          <p>
            {record.reason ||
              "Nenhuma justificativa adicional registrada."}
          </p>
        </section>

        <section>
          <span className={styles.label}>
            Nota da auditoria
          </span>

          <p>
            {record.audit_note ||
              "Nenhuma nota adicional registrada."}
          </p>
        </section>

        {record.removal_minutes !==
          null && (
          <section>
            <span
              className={styles.label}
            >
              Tempo até remoção
            </span>

            <p>
              {record.removal_minutes}{" "}
              minutos
            </p>
          </section>
        )}
      </div>

      <section
        className={styles.timeline}
      >
        <div
          className={
            styles.timelineHeading
          }
        >
          <span>LOG DE AUDITORIA</span>

          <strong>
            {logs.length} eventos
          </strong>
        </div>

        {loadingLogs && (
          <div
            className={styles.logState}
          >
            Consultando histórico...
          </div>
        )}

        {!loadingLogs &&
          logError && (
            <div
              className={
                styles.logError
              }
              role="alert"
            >
              {logError}
            </div>
          )}

        {!loadingLogs &&
          !logError &&
          logs.length === 0 && (
            <div
              className={
                styles.logState
              }
            >
              Nenhum evento adicional foi
              registrado para esta
              evidência.
            </div>
          )}

        {!loadingLogs &&
          !logError &&
          logs.length > 0 && (
            <ol
              className={
                styles.logList
              }
            >
              {logs.map((log) => (
                <li key={log.id}>
                  <div
                    className={
                      styles.timelineMarker
                    }
                  />

                  <div>
                    <time>
                      {formatDate(
                        log.occurred_at,
                      )}
                    </time>

                    <p>
                      {log.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
      </section>

      <div className={styles.actions}>
        <button
          type="button"
          className={
            selected
              ? styles.selected
              : styles.select
          }
          disabled={changing}
          onClick={
            onEvidenceToggle
          }
        >
          {changing
            ? "Salvando..."
            : selected
              ? "✓ Evidência selecionada"
              : "+ Adicionar às evidências"}
        </button>
      </div>
    </div>
  );
}

export default AuditDossier;