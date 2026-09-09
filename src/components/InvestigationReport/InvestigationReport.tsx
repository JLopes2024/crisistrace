import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  completeReport,
  getOrCreateReport,
  saveReport,
} from "../../lib/report";

import {
  downloadPdf,
  generateInvestigationPdf,
} from "../../lib/pdf";

import type {
  AuditRecord,
} from "../../types/audit";

import type {
  InvestigationReport as InvestigationReportType,
  ReportFormData,
} from "../../types/report";

import styles from "./InvestigationReport.module.css";

type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error";

interface InvestigationReportProps {
  investigationId: string;
  roomCode: string;
  evidence: AuditRecord[];
  onClose: () => void;
}

const emptyForm:
  ReportFormData = {
    what_happened: "",
    affected_people: "",
    involved_audiences: "",
    data_findings: "",
    causes: "",
    apparent_problem: "",
    real_problem: "",
    initial_diagnosis: "",
  };

const fieldDefinitions: {
  key: keyof ReportFormData;
  number: string;
  title: string;
  help: string;
  placeholder: string;
}[] = [
  {
    key: "what_happened",
    number: "01",
    title:
      "O que aconteceu?",
    help:
      "Reconstrua o episódio com base nos registros e evidências encontradas.",
    placeholder:
      "Descreva objetivamente a sequência dos acontecimentos...",
  },
  {
    key: "affected_people",
    number: "02",
    title:
      "Quem foi afetado?",
    help:
      "Identifique pessoas, setores ou grupos diretamente impactados.",
    placeholder:
      "Ex.: atleta, torcida, diretoria, patrocinadores...",
  },
  {
    key: "involved_audiences",
    number: "03",
    title:
      "Quais públicos estão envolvidos?",
    help:
      "Mapeie os públicos internos e externos relacionados à crise.",
    placeholder:
      "Liste e explique os principais públicos envolvidos...",
  },
  {
    key: "data_findings",
    number: "04",
    title:
      "O que os dados revelam?",
    help:
      "Use números, sinais de reputação e comportamento observados na auditoria.",
    placeholder:
      "Ex.: sentimento negativo, queda de ingressos, aumento de comentários...",
  },
  {
    key: "causes",
    number: "05",
    title:
      "Quais são as causas?",
    help:
      "Identifique fatores que provocaram ou ampliaram o problema.",
    placeholder:
      "Diferencie acontecimentos iniciais de fatores que agravaram a crise...",
  },
  {
    key: "apparent_problem",
    number: "06",
    title:
      "Qual é o problema aparente?",
    help:
      "Registre aquilo que parece ser o problema em uma primeira leitura.",
    placeholder:
      "Qual problema é imediatamente visível para quem acompanha o caso?",
  },
  {
    key: "real_problem",
    number: "07",
    title:
      "Qual é o problema real?",
    help:
      "Vá além do sintoma e identifique a raiz comunicacional ou reputacional.",
    placeholder:
      "Qual é o problema estrutural por trás dos acontecimentos?",
  },
  {
    key: "initial_diagnosis",
    number: "08",
    title:
      "Diagnóstico inicial",
    help:
      "Sintetize a leitura da equipe e indique o grau de urgência do caso.",
    placeholder:
      "Apresente a conclusão da auditoria inicial...",
  },
];

function normalizeReport(
  report:
    InvestigationReportType,
): ReportFormData {
  return {
    what_happened:
      report.what_happened ||
      "",

    affected_people:
      report.affected_people ||
      "",

    involved_audiences:
      report.involved_audiences ||
      "",

    data_findings:
      report.data_findings ||
      "",

    causes:
      report.causes ||
      "",

    apparent_problem:
      report.apparent_problem ||
      "",

    real_problem:
      report.real_problem ||
      "",

    initial_diagnosis:
      report.initial_diagnosis ||
      "",
  };
}

function InvestigationReport({
  investigationId,
  roomCode,
  evidence,
  onClose,
}: InvestigationReportProps) {
  const [
    report,
    setReport,
  ] =
    useState<InvestigationReportType | null>(
      null,
    );

  const [
    formData,
    setFormData,
  ] =
    useState<ReportFormData>(
      emptyForm,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    saveStatus,
    setSaveStatus,
  ] =
    useState<SaveStatus>(
      "idle",
    );

  const [
    completing,
    setCompleting,
  ] = useState(false);

  const [
    completionError,
    setCompletionError,
  ] = useState("");

  const [
    generatingPdf,
    setGeneratingPdf,
  ] = useState(false);

  const [
    pdfError,
    setPdfError,
  ] = useState("");

  const initialLoad =
    useRef(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setLoadError("");

        const loadedReport =
          await getOrCreateReport(
            investigationId,
          );

        if (!active) {
          return;
        }

        setReport(
          loadedReport,
        );

        setFormData(
          normalizeReport(
            loadedReport,
          ),
        );

        initialLoad.current =
          false;
      } catch (error) {
        console.error(
          "Erro ao carregar relatório:",
          error,
        );

        if (active) {
          setLoadError(
            "Não foi possível carregar o relatório.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [investigationId]);

  /*
   * Autosave com debounce.
   */
  useEffect(() => {
    if (
      initialLoad.current ||
      !report ||
      report.status ===
        "completed"
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        async () => {
          try {
            setSaveStatus(
              "saving",
            );

            const saved =
              await saveReport(
                report.id,
                formData,
              );

            setReport(
              saved,
            );

            setSaveStatus(
              "saved",
            );
          } catch (error) {
            console.error(
              "Erro no autosave:",
              error,
            );

            setSaveStatus(
              "error",
            );
          }
        },
        800,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    formData,
    report?.id,
    report?.status,
  ]);

  const completedFields =
    useMemo(
      () =>
        fieldDefinitions.filter(
          ({ key }) =>
            formData[
              key
            ].trim().length >
            0,
        ).length,
      [formData],
    );

  const progress =
    Math.round(
      (completedFields /
        fieldDefinitions.length) *
        100,
    );

  const isCompleted =
    report?.status ===
    "completed";

  function handleChange(
    key:
      keyof ReportFormData,
    value: string,
  ) {
    if (isCompleted) {
      return;
    }

    setCompletionError("");
    setPdfError("");

    setSaveStatus(
      "idle",
    );

    setFormData(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  async function handleComplete() {
    if (
      !report ||
      isCompleted ||
      completing
    ) {
      return;
    }

    const missingField =
      fieldDefinitions.find(
        ({ key }) =>
          !formData[
            key
          ].trim(),
      );

    if (missingField) {
      setCompletionError(
        `Preencha o campo "${missingField.title}" antes de finalizar.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Finalizar o Relatório de Impacto Raio-X? Após a conclusão, as respostas não poderão mais ser alteradas.",
      );

    if (!confirmed) {
      return;
    }

    try {
      setCompleting(
        true,
      );

      setCompletionError(
        "",
      );

      /*
       * Salvamos diretamente na
       * operação de conclusão.
       * Não dependemos do autosave.
       */
      const completed =
        await completeReport(
          report.id,
          formData,
        );

      setReport(
        completed,
      );

      setSaveStatus(
        "saved",
      );
    } catch (error) {
      console.error(
        "Erro ao finalizar relatório:",
        error,
      );

      setCompletionError(
        "Não foi possível finalizar o relatório.",
      );
    } finally {
      setCompleting(
        false,
      );
    }
  }

  async function handleGeneratePdf() {
    if (
      !report ||
      report.status !==
        "completed" ||
      generatingPdf
    ) {
      return;
    }

    try {
      setGeneratingPdf(
        true,
      );

      setPdfError("");

      const {
        blob,
        filename,
      } =
        await generateInvestigationPdf(
          investigationId,
        );

      downloadPdf(
        blob,
        filename,
      );
    } catch (error) {
      console.error(
        "Erro ao gerar PDF:",
        error,
      );

      setPdfError(
        error instanceof Error
          ? error.message
          : "Não foi possível gerar o PDF.",
      );
    } finally {
      setGeneratingPdf(
        false,
      );
    }
  }

  if (loading) {
    return (
      <div
        className={
          styles.overlay
        }
      >
        <section
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.state
            }
          >
            <div
              className={
                styles.loader
              }
            />

            <strong>
              Carregando relatório...
            </strong>
          </div>
        </section>
      </div>
    );
  }

  if (
    loadError ||
    !report
  ) {
    return (
      <div
        className={
          styles.overlay
        }
      >
        <section
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.state
            }
          >
            <strong>
              Não foi possível abrir o relatório.
            </strong>

            <span>
              {loadError}
            </span>

            <button
              type="button"
              onClick={
                onClose
              }
            >
              Fechar
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={
        styles.overlay
      }
    >
      <section
        className={
          styles.panel
        }
      >
        <header
          className={
            styles.header
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              OPERAÇÃO RAIO-X
            </span>

            <h2>
              Relatório de Impacto
            </h2>

            <p>
              Diagnóstico inicial da crise reputacional.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.close
            }
            onClick={
              onClose
            }
            aria-label="Fechar relatório"
          >
            ×
          </button>
        </header>

        <div
          className={
            styles.meta
          }
        >
          <div>
            <span>
              IDENTIFICAÇÃO
            </span>

            <strong>
              {roomCode}
            </strong>
          </div>

          <div>
            <span>
              EVIDÊNCIAS
            </span>

            <strong>
              {evidence.length}
            </strong>
          </div>

          <div>
            <span>
              PROGRESSO
            </span>

            <strong>
              {completedFields}/
              {
                fieldDefinitions.length
              }
            </strong>
          </div>

          <div>
            <span>
              STATUS
            </span>

            <strong
              className={
                isCompleted
                  ? styles.completedStatus
                  : styles.draftStatus
              }
            >
              {isCompleted
                ? "FINALIZADO"
                : "RASCUNHO"}
            </strong>
          </div>
        </div>

        <div
          className={
            styles.progress
          }
        >
          <div
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <div
          className={
            styles.saveIndicator
          }
        >
          {isCompleted ? (
            <span>
              Relatório finalizado e bloqueado para edição.
            </span>
          ) : (
            <>
              {saveStatus ===
                "idle" && (
                <span>
                  As respostas são salvas automaticamente.
                </span>
              )}

              {saveStatus ===
                "saving" && (
                <span>
                  Salvando...
                </span>
              )}

              {saveStatus ===
                "saved" && (
                <span>
                  ✓ Alterações salvas
                </span>
              )}

              {saveStatus ===
                "error" && (
                <span
                  className={
                    styles.saveError
                  }
                >
                  Falha ao salvar automaticamente.
                </span>
              )}
            </>
          )}
        </div>

        <div
          className={
            styles.body
          }
        >
          <aside
            className={
              styles.evidenceColumn
            }
          >
            <div
              className={
                styles.evidenceHeader
              }
            >
              <span>
                MATERIAL ANALISADO
              </span>

              <h3>
                Evidências selecionadas
              </h3>
            </div>

            {evidence.length ===
            0 ? (
              <div
                className={
                  styles.emptyEvidence
                }
              >
                Nenhuma evidência foi selecionada.
              </div>
            ) : (
              <div
                className={
                  styles.evidenceList
                }
              >
                {evidence.map(
                  (
                    record,
                    index,
                  ) => (
                    <article
                      key={
                        record.id
                      }
                      className={
                        styles.evidenceItem
                      }
                    >
                      <div
                        className={
                          styles.evidenceCode
                        }
                      >
                        <span>
                          {String(
                            index +
                              1,
                          ).padStart(
                            2,
                            "0",
                          )}
                        </span>

                        <strong>
                          {
                            record.record_code
                          }
                        </strong>
                      </div>

                      <h4>
                        {
                          record.title
                        }
                      </h4>

                      <p>
                        {record.preview ||
                          record.content ||
                          "Conteúdo sem prévia."}
                      </p>
                    </article>
                  ),
                )}
              </div>
            )}
          </aside>

          <div
            className={
              styles.form
            }
          >
            {fieldDefinitions.map(
              (
                field,
              ) => (
                <ReportField
                  key={
                    field.key
                  }
                  number={
                    field.number
                  }
                  title={
                    field.title
                  }
                  help={
                    field.help
                  }
                  placeholder={
                    field.placeholder
                  }
                  value={
                    formData[
                      field.key
                    ]
                  }
                  disabled={
                    isCompleted
                  }
                  onChange={(
                    value,
                  ) =>
                    handleChange(
                      field.key,
                      value,
                    )
                  }
                />
              ),
            )}
          </div>
        </div>

        <footer
          className={
            styles.footer
          }
        >
          <div
            className={
              styles.footerInfo
            }
          >
            {!isCompleted ? (
              <>
                <span>
                  {
                    completedFields
                  }{" "}
                  de{" "}
                  {
                    fieldDefinitions.length
                  }{" "}
                  respostas preenchidas
                </span>

                <strong>
                  {progress}% concluído
                </strong>
              </>
            ) : (
              <>
                <span>
                  Relatório concluído
                </span>

                <strong>
                  Documento pronto para exportação
                </strong>
              </>
            )}
          </div>

          <div
            className={
              styles.footerActions
            }
          >
            <button
              type="button"
              className={
                styles.secondaryButton
              }
              onClick={
                onClose
              }
            >
              Fechar
            </button>

            {!isCompleted && (
              <button
                type="button"
                className={
                  styles.completeButton
                }
                disabled={
                  completing
                }
                onClick={
                  handleComplete
                }
              >
                {completing
                  ? "Finalizando..."
                  : "Finalizar relatório"}
              </button>
            )}

            {isCompleted && (
              <button
                type="button"
                className={
                  styles.pdfButton
                }
                disabled={
                  generatingPdf
                }
                onClick={
                  handleGeneratePdf
                }
              >
                {generatingPdf
                  ? "Gerando PDF..."
                  : "Gerar relatório PDF"}
              </button>
            )}
          </div>
        </footer>

        {completionError && (
          <div
            className={
              styles.bottomError
            }
            role="alert"
          >
            {completionError}
          </div>
        )}

        {pdfError && (
          <div
            className={
              styles.bottomError
            }
            role="alert"
          >
            {pdfError}
          </div>
        )}
      </section>
    </div>
  );
}

interface ReportFieldProps {
  number: string;
  title: string;
  help: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onChange: (
    value: string,
  ) => void;
}

function ReportField({
  number,
  title,
  help,
  placeholder,
  value,
  disabled,
  onChange,
}: ReportFieldProps) {
  return (
    <section
      className={
        styles.field
      }
    >
      <div
        className={
          styles.fieldHeader
        }
      >
        <span
          className={
            styles.fieldNumber
          }
        >
          {number}
        </span>

        <div>
          <h3>
            {title}
          </h3>

          <p>
            {help}
          </p>
        </div>
      </div>

      <textarea
        value={value}
        disabled={
          disabled
        }
        placeholder={
          placeholder
        }
        rows={6}
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
      />

      <div
        className={
          styles.counter
        }
      >
        {value.length} caracteres
      </div>
    </section>
  );
}

export default InvestigationReport;