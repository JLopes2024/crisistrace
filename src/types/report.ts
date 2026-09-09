export type ReportStatus = "draft" | "completed";

export interface InvestigationReport {
  id: string;
  investigation_id: string;

  what_happened: string;
  affected_people: string;
  involved_audiences: string;
  data_findings: string;
  causes: string;
  apparent_problem: string;
  real_problem: string;
  initial_diagnosis: string;

  status: ReportStatus;

  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type ReportFormData = Pick<
  InvestigationReport,
  | "what_happened"
  | "affected_people"
  | "involved_audiences"
  | "data_findings"
  | "causes"
  | "apparent_problem"
  | "real_problem"
  | "initial_diagnosis"
>;