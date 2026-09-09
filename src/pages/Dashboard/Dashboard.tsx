import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import AuditDossier from "../../components/AuditDossier/AuditDossier";
import EvidencePanel from "../../components/EvidencePanel/EvidencePanel";
import InvestigationReport from "../../components/InvestigationReport/InvestigationReport";
import MissionUnlock from "../../components/MissionUnlock/MissionUnlock";

import {
  getActiveCase,
  getAuditRecords,
} from "../../lib/audit";

import {
  getClassroomSessionById,
  getPeriodLabel,
} from "../../lib/classroomSession";

import type {
  ClassroomSession,
} from "../../lib/classroomSession";

import {
  getOrCreateInvestigation,
  getSelectedEvidence,
  removeEvidence,
  selectEvidence,
} from "../../lib/investigation";

import {
  getMissionState,
  setRestrictedEvidence,
  unlockMission,
} from "../../lib/mission";

import { supabase } from "../../lib/supabase";

import type {
  AuditLog,
  AuditRecord,
  CrisisCase,
  RecordStatus,
  RiskLevel,
} from "../../types/audit";

import styles from "./Dashboard.module.css";

type RiskFilter =
  | "all"
  | RiskLevel;

type StatusFilter =
  | "all"
  | RecordStatus;

const riskLabels: Record<
  RiskLevel,
  string
> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

const statusLabels: Record<
  RecordStatus,
  string
> = {
  recovered: "Recuperado",
  removed: "Removido",
  restricted: "Restrito",
};

function Dashboard() {
  const navigate =
    useNavigate();

  const [
    roomCode,
    setRoomCode,
  ] = useState("");

  const [
    isProfessors,
    setIsProfessors,
  ] = useState(false);

  const [
    classroomSession,
    setClassroomSession,
  ] =
    useState<ClassroomSession | null>(
      null,
    );

  const [
    crisisCase,
    setCrisisCase,
  ] =
    useState<CrisisCase | null>(
      null,
    );

  const [
    records,
    setRecords,
  ] =
    useState<AuditRecord[]>([]);

  const [
    investigationId,
    setInvestigationId,
  ] = useState("");

  const [
    selectedEvidence,
    setSelectedEvidence,
  ] =
    useState<string[]>([]);

  const [
    changingEvidence,
    setChangingEvidence,
  ] =
    useState<string | null>(
      null,
    );

  const [
    openRecordId,
    setOpenRecordId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    evidencePanelOpen,
    setEvidencePanelOpen,
  ] = useState(false);

  const [
    reportOpen,
    setReportOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    riskFilter,
    setRiskFilter,
  ] =
    useState<RiskFilter>(
      "all",
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all",
    );

  const [
    missionLoading,
    setMissionLoading,
  ] = useState(false);

  const [
    missionUnlocked,
    setMissionUnlocked,
  ] = useState(false);

  const [
    missionRecord,
    setMissionRecord,
  ] =
    useState<AuditRecord | null>(
      null,
    );

  const [
    missionLogs,
    setMissionLogs,
  ] =
    useState<AuditLog[]>([]);

  const [
    restrictedEvidenceSelected,
    setRestrictedEvidenceSelected,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user?.email) {
          navigate(
            "/login",
            {
              replace: true,
            },
          );

          return;
        }

        const currentRoomCode =
          user.email
            .split("@")[0]
            .toUpperCase();

        const professorAccess =
          currentRoomCode ===
          "PROFESSORES";

        setRoomCode(
          currentRoomCode,
        );

        setIsProfessors(
          professorAccess,
        );

        let currentSession:
          | ClassroomSession
          | null = null;

        if (!professorAccess) {
          const sessionId =
            sessionStorage.getItem(
              "crisistrace_session_id",
            );

          if (!sessionId) {
            navigate(
              "/session",
              {
                replace: true,
              },
            );

            return;
          }

          currentSession =
            await getClassroomSessionById(
              sessionId,
            );

          if (
            !currentSession ||
            currentSession.user_id !==
              user.id
          ) {
            sessionStorage.removeItem(
              "crisistrace_session_id",
            );

            navigate(
              "/session",
              {
                replace: true,
              },
            );

            return;
          }

          setClassroomSession(
            currentSession,
          );
        }

        const activeCase =
          await getActiveCase();

        const auditRecords =
          await getAuditRecords(
            activeCase.id,
          );

        const investigation =
          await getOrCreateInvestigation(
            activeCase.id,
            currentSession?.id ??
              null,
          );

        const evidenceIds =
          await getSelectedEvidence(
            investigation.id,
          );

        if (!active) {
          return;
        }

        setCrisisCase(
          activeCase,
        );

        setRecords(
          auditRecords,
        );

        setInvestigationId(
          investigation.id,
        );

        setSelectedEvidence(
          evidenceIds,
        );

        setMissionLoading(true);

        try {
          const mission =
            await getMissionState(
              investigation.id,
            );

          if (!active) {
            return;
          }

          setMissionUnlocked(
            mission.unlocked,
          );

          setMissionRecord(
            mission.record ??
              null,
          );

          setMissionLogs(
            mission.logs ?? [],
          );

          setRestrictedEvidenceSelected(
            mission.restrictedEvidenceSelected ??
              false,
          );
        } finally {
          if (active) {
            setMissionLoading(
              false,
            );
          }
        }
      } catch (error) {
        console.error(
          "Erro ao carregar dashboard:",
          error,
        );

        if (active) {
          setError(
            "Não foi possível carregar os dados da investigação.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [navigate]);

  const filteredRecords =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {
          const matchesSearch =
            !term ||
            record.record_code
              .toLowerCase()
              .includes(term) ||
            record.title
              .toLowerCase()
              .includes(term) ||
            record.author
              ?.toLowerCase()
              .includes(term) ||
            record.platform
              ?.toLowerCase()
              .includes(term) ||
            record.content
              ?.toLowerCase()
              .includes(term) ||
            record.preview
              ?.toLowerCase()
              .includes(term) ||
            record.tags.some(
              (tag) =>
                tag
                  .toLowerCase()
                  .includes(term),
            );

          const matchesRisk =
            riskFilter === "all" ||
            record.risk_level ===
              riskFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            record.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesRisk &&
            matchesStatus
          );
        },
      );
    }, [
      records,
      search,
      riskFilter,
      statusFilter,
    ]);

  const selectedRecords =
    useMemo(
      () =>
        records.filter(
          (record) =>
            selectedEvidence.includes(
              record.id,
            ),
        ),
      [
        records,
        selectedEvidence,
      ],
    );

  const reportEvidence =
    useMemo(() => {
      if (
        missionRecord &&
        restrictedEvidenceSelected
      ) {
        return [
          ...selectedRecords,
          missionRecord,
        ];
      }

      return selectedRecords;
    }, [
      selectedRecords,
      missionRecord,
      restrictedEvidenceSelected,
    ]);

  const criticalCount =
    useMemo(
      () =>
        records.filter(
          (record) =>
            record.risk_level ===
            "critical",
        ).length +
        (
          missionUnlocked &&
          missionRecord
            ?.risk_level ===
            "critical"
            ? 1
            : 0
        ),
      [
        records,
        missionUnlocked,
        missionRecord,
      ],
    );

  const removedCount =
    useMemo(
      () =>
        records.filter(
          (record) =>
            record.status ===
            "removed",
        ).length,
      [records],
    );

  const totalVisibleRecords =
    records.length +
    (
      missionUnlocked
        ? 1
        : 0
    );

  const totalEvidence =
    selectedEvidence.length +
    (
      restrictedEvidenceSelected
        ? 1
        : 0
    );

  async function handleEvidenceToggle(
    recordId: string,
  ) {
    if (
      !investigationId ||
      changingEvidence
    ) {
      return;
    }

    const isSelected =
      selectedEvidence.includes(
        recordId,
      );

    try {
      setChangingEvidence(
        recordId,
      );

      if (isSelected) {
        await removeEvidence(
          investigationId,
          recordId,
        );

        setSelectedEvidence(
          (current) =>
            current.filter(
              (id) =>
                id !==
                recordId,
            ),
        );
      } else {
        await selectEvidence(
          investigationId,
          recordId,
        );

        setSelectedEvidence(
          (current) => [
            ...current,
            recordId,
          ],
        );
      }
    } catch (error) {
      console.error(error);

      window.alert(
        "Não foi possível alterar a evidência.",
      );
    } finally {
      setChangingEvidence(
        null,
      );
    }
  }

  async function handleMissionUnlock(
    code: string,
  ) {
    if (!investigationId) {
      return;
    }

    const result =
      await unlockMission(
        investigationId,
        code,
      );

    if (!result.success) {
      throw new Error(
        result.error ||
          "Não foi possível desbloquear a missão.",
      );
    }

    const state =
      await getMissionState(
        investigationId,
      );

    setMissionUnlocked(
      state.unlocked,
    );

    setMissionRecord(
      state.record ?? null,
    );

    setMissionLogs(
      state.logs ?? [],
    );

    setRestrictedEvidenceSelected(
      state.restrictedEvidenceSelected ??
        false,
    );
  }

  async function handleRestrictedEvidenceToggle() {
    if (
      !investigationId ||
      !missionRecord
    ) {
      return;
    }

    const next =
      !restrictedEvidenceSelected;

    await setRestrictedEvidence(
      investigationId,
      next,
    );

    setRestrictedEvidenceSelected(
      next,
    );
  }

  function handleDossierToggle(
    recordId: string,
  ) {
    setOpenRecordId(
      (current) =>
        current === recordId
          ? null
          : recordId,
    );
  }

  function handleStartReport() {
    if (!investigationId) {
      return;
    }

    setEvidencePanelOpen(
      false,
    );

    setReportOpen(true);
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

  if (loading) {
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
          Carregando investigação...
        </strong>

        <span>
          Consultando registros.
        </span>
      </main>
    );
  }

  if (
    error ||
    !crisisCase
  ) {
    return (
      <main
        className={
          styles.statePage
        }
      >
        <strong>
          Não foi possível abrir a investigação.
        </strong>

        <span>
          {error ||
            "Caso não encontrado."}
        </span>
      </main>
    );
  }

  return (
    <main
      className={
        styles.page
      }
    >
      <header
        className={
          styles.topbar
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
            <strong>
              CrisisTrace
            </strong>

            <span>
              Digital Reputation Intelligence
            </span>
          </div>
        </div>

        <div
          className={
            styles.session
          }
        >
          <div>
            <span>
              {isProfessors
                ? "ACESSO"
                : "SALA"}
            </span>

            <strong>
              {isProfessors
                ? "PROFESSORES"
                : roomCode}
            </strong>

            {!isProfessors &&
              classroomSession && (
                <small>
                  {getPeriodLabel(
                    classroomSession.period,
                  )}
                  {" • "}
                  Grupo{" "}
                  {
                    classroomSession.group_number
                  }
                </small>
              )}
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
          >
            Sair
          </button>
        </div>
      </header>

      <section
        className={
          styles.caseHeader
        }
      >
        <div
          className={
            styles.caseHeaderContent
          }
        >
          <div
            className={
              styles.caseMeta
            }
          >
            <span>
              CASO{" "}
              {crisisCase.code}
            </span>

            <span
              className={
                styles.classification
              }
            >
              {
                crisisCase.classification
              }
            </span>
          </div>

          <h1>
            {crisisCase.title}
          </h1>

          <p>
            {
              crisisCase.organization
            }
          </p>

          {crisisCase.description && (
            <div
              className={
                styles.description
              }
            >
              {
                crisisCase.description
              }
            </div>
          )}
        </div>
      </section>

      <section
        className={
          styles.workspace
        }
      >
        <div
          className={
            styles.metrics
          }
        >
          <article>
            <span>
              REGISTROS
            </span>

            <strong>
              {totalVisibleRecords}
            </strong>

            <small>
              Disponíveis para análise
            </small>
          </article>

          <article>
            <span>
              RISCO CRÍTICO
            </span>

            <strong>
              {criticalCount}
            </strong>

            <small>
              Exigem atenção imediata
            </small>
          </article>

          <article>
            <span>
              REMOVIDOS
            </span>

            <strong>
              {removedCount}
            </strong>

            <small>
              Recuperados pela auditoria
            </small>
          </article>

          <article
            className={
              styles.evidenceMetric
            }
            onClick={() =>
              setEvidencePanelOpen(
                true,
              )
            }
          >
            <span>
              EVIDÊNCIAS
            </span>

            <strong>
              {totalEvidence}
            </strong>

            <small>
              Ver seleção →
            </small>
          </article>
        </div>

        <div
          className={
            styles.missionSection
          }
        >
          <div
            className={
              styles.missionSectionHeader
            }
          >
            <div>
              <span>
                PROTOCOLO ESPECIAL
              </span>

              <h2>
                Missão 07
              </h2>
            </div>

            <strong>
              {missionUnlocked
                ? "ATIVADO"
                : "RESTRITO"}
            </strong>
          </div>

          <MissionUnlock
            investigationId={
              investigationId
            }
            unlocked={
              missionUnlocked
            }
            record={
              missionRecord
            }
            logs={
              missionLogs
            }
            evidenceSelected={
              restrictedEvidenceSelected
            }
            loading={
              missionLoading
            }
            onUnlock={
              handleMissionUnlock
            }
            onEvidenceToggle={
              handleRestrictedEvidenceToggle
            }
          />
        </div>

        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <span>
              OPERAÇÃO RAIO-X
            </span>

            <h2>
              Registros de Auditoria
            </h2>

            <p>
              Investigue publicações, decisões e rastros digitais relacionados à crise.
            </p>
          </div>

          <strong>
            {
              filteredRecords.length
            }{" "}
            encontrados
          </strong>
        </div>

        <div
          className={
            styles.filters
          }
        >
          <label>
            <span>
              Buscar
            </span>

            <input
              type="search"
              value={search}
              placeholder="Código, conteúdo, autor, plataforma ou tag..."
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </label>

          <label>
            <span>
              Risco
            </span>

            <select
              value={riskFilter}
              onChange={(
                event,
              ) =>
                setRiskFilter(
                  event.target
                    .value as RiskFilter,
                )
              }
            >
              <option value="all">
                Todos
              </option>

              <option value="critical">
                Crítico
              </option>

              <option value="high">
                Alto
              </option>

              <option value="medium">
                Médio
              </option>

              <option value="low">
                Baixo
              </option>
            </select>
          </label>

          <label>
            <span>
              Status
            </span>

            <select
              value={statusFilter}
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
            >
              <option value="all">
                Todos
              </option>

              <option value="recovered">
                Recuperado
              </option>

              <option value="removed">
                Removido
              </option>

              <option value="restricted">
                Restrito
              </option>
            </select>
          </label>
        </div>

        {filteredRecords.length ===
        0 ? (
          <div
            className={
              styles.empty
            }
          >
            <strong>
              Nenhum registro encontrado.
            </strong>

            <span>
              Tente alterar os filtros.
            </span>
          </div>
        ) : (
          <div
            className={
              styles.recordList
            }
          >
            {filteredRecords.map(
              (record) => {
                const isSelected =
                  selectedEvidence.includes(
                    record.id,
                  );

                const isChanging =
                  changingEvidence ===
                  record.id;

                const isOpen =
                  openRecordId ===
                  record.id;

                return (
                  <article
                    key={
                      record.id
                    }
                    className={
                      styles.record
                    }
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
                              record.risk_level
                            ]
                          }
                        </strong>
                      )}
                    </div>

                    <div
                      className={
                        styles.recordBody
                      }
                    >
                      <div
                        className={
                          styles.recordHeading
                        }
                      >
                        <div>
                          <h3>
                            {
                              record.title
                            }
                          </h3>

                          <p>
                            {record.platform ||
                              "Origem não identificada"}

                            {record.author &&
                              ` • ${record.author}`}
                          </p>
                        </div>

                        <span
                          className={`${styles.status} ${
                            styles[
                              `status_${record.status}`
                            ]
                          }`}
                        >
                          {
                            statusLabels[
                              record.status
                            ]
                          }
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
                          styles.recordActions
                        }
                      >
                        <button
                          type="button"
                          className={
                            styles.dossierButton
                          }
                          onClick={() =>
                            handleDossierToggle(
                              record.id,
                            )
                          }
                        >
                          {isOpen
                            ? "Fechar dossiê"
                            : "Abrir dossiê"}
                        </button>

                        <button
                          type="button"
                          className={
                            isSelected
                              ? styles.evidenceSelected
                              : styles.evidenceButton
                          }
                          disabled={
                            isChanging
                          }
                          onClick={() =>
                            handleEvidenceToggle(
                              record.id,
                            )
                          }
                        >
                          {isChanging
                            ? "Salvando..."
                            : isSelected
                              ? "✓ Evidência selecionada"
                              : "+ Adicionar às evidências"}
                        </button>
                      </div>

                      {isOpen && (
                        <AuditDossier
                          record={
                            record
                          }
                          selected={
                            isSelected
                          }
                          changing={
                            isChanging
                          }
                          onEvidenceToggle={() =>
                            handleEvidenceToggle(
                              record.id,
                            )
                          }
                          onClose={() =>
                            setOpenRecordId(
                              null,
                            )
                          }
                        />
                      )}

                      <footer>
                        <div
                          className={
                            styles.tags
                          }
                        >
                          {record.tags.map(
                            (
                              tag,
                            ) => (
                              <span
                                key={
                                  tag
                                }
                              >
                                {tag}
                              </span>
                            ),
                          )}
                        </div>

                        {record.occurred_at && (
                          <time>
                            {new Intl.DateTimeFormat(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            ).format(
                              new Date(
                                record.occurred_at,
                              ),
                            )}
                          </time>
                        )}
                      </footer>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      {evidencePanelOpen && (
        <EvidencePanel
          records={
            reportEvidence
          }
          changingEvidence={
            changingEvidence
          }
          onClose={() =>
            setEvidencePanelOpen(
              false,
            )
          }
          onRemove={async (
            recordId,
          ) => {
            if (
              missionRecord &&
              recordId ===
                missionRecord.id
            ) {
              await handleRestrictedEvidenceToggle();
              return;
            }

            await handleEvidenceToggle(
              recordId,
            );
          }}
          onStartReport={
            handleStartReport
          }
        />
      )}

      {reportOpen && (
        <InvestigationReport
          investigationId={
            investigationId
          }
          roomCode={
            isProfessors
              ? "PROFESSORES"
              : `${roomCode} • ${
                  classroomSession
                    ? `${getPeriodLabel(
                        classroomSession.period,
                      )} • Grupo ${
                        classroomSession.group_number
                      }`
                    : ""
                }`
          }
          evidence={
            reportEvidence
          }
          onClose={() =>
            setReportOpen(
              false,
            )
          }
        />
      )}
    </main>
  );
}

export default Dashboard;