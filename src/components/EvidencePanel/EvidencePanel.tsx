import type { AuditRecord } from "../../types/audit";

import styles from "./EvidencePanel.module.css";

type EvidencePanelProps = {
  records: AuditRecord[];
  changingEvidence: string | null;
  onClose: () => void;
  onRemove: (recordId: string) => void;
  onStartReport: () => void;
};

const riskLabels = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

function EvidencePanel({
  records,
  changingEvidence,
  onClose,
  onRemove,
  onStartReport,
}: EvidencePanelProps) {
  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-panel-title"
    >
      <aside className={styles.panel}>
        <header className={styles.header}>
          <div>
            <span>
              OPERAÇÃO RAIO-X
            </span>

            <h2 id="evidence-panel-title">
              Minhas Evidências
            </h2>

            <p>
              Registros selecionados para
              compor o diagnóstico da
              investigação.
            </p>
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fechar painel"
          >
            ×
          </button>
        </header>

        <div className={styles.summary}>
          <div>
            <span>
              EVIDÊNCIAS SELECIONADAS
            </span>

            <strong>
              {records.length}
            </strong>
          </div>

          <p>
            Revise os registros antes de
            iniciar o Relatório Raio-X.
          </p>
        </div>

        <div className={styles.content}>
          {records.length === 0 ? (
            <div
              className={styles.empty}
            >
              <strong>
                Nenhuma evidência
                selecionada.
              </strong>

              <p>
                Volte aos registros e
                selecione os itens
                relevantes.
              </p>
            </div>
          ) : (
            <div
              className={styles.list}
            >
              {records.map((record) => (
                <article
                  key={record.id}
                  className={
                    styles.evidence
                  }
                >
                  <div
                    className={
                      styles.evidenceHeader
                    }
                  >
                    <div>
                      <span>
                        {
                          record.record_code
                        }
                      </span>

                      <h3>
                        {record.title}
                      </h3>
                    </div>

                    {record.risk_level && (
                      <strong
                        className={`${styles.risk} ${
                          styles[
                            `risk_${record.risk_level}`
                          ]
                        }`}
                      >
                        {
                          riskLabels[
                            record
                              .risk_level
                          ]
                        }
                      </strong>
                    )}
                  </div>

                  <p
                    className={
                      styles.origin
                    }
                  >
                    {record.platform ||
                      "Origem não identificada"}

                    {record.author &&
                      ` • ${record.author}`}
                  </p>

                  {record.preview && (
                    <p
                      className={
                        styles.preview
                      }
                    >
                      {record.preview}
                    </p>
                  )}

                  <div
                    className={styles.tags}
                  >
                    {record.tags.map(
                      (tag) => (
                        <span key={tag}>
                          {tag}
                        </span>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    className={
                      styles.remove
                    }
                    disabled={
                      changingEvidence ===
                      record.id
                    }
                    onClick={() =>
                      onRemove(
                        record.id,
                      )
                    }
                  >
                    {changingEvidence ===
                    record.id
                      ? "Removendo..."
                      : "Remover das evidências"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <div>
            <span>
              PRÓXIMA ETAPA
            </span>

            <strong>
              Relatório de Impacto
              Raio-X
            </strong>
          </div>

          <button
            type="button"
            className={
              styles.reportButton
            }
            disabled={
              records.length === 0
            }
            onClick={onStartReport}
          >
            Iniciar relatório →
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default EvidencePanel;