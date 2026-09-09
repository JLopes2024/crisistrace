export type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type RecordStatus =
  | "removed"
  | "recovered"
  | "restricted";

export type ConfidenceLevel =
  | "low"
  | "medium"
  | "high";

export interface AuditRecord {
  id: string;
  record_code: string;
  occurred_at: string | null;
  platform: string | null;
  author: string | null;
  title: string;
  preview: string | null;
  content: string | null;
  risk_level: RiskLevel | null;
  status: RecordStatus;
  reason: string | null;
  audit_note: string | null;
  tags: string[];
  confidence: ConfidenceLevel | null;
  removal_minutes: number | null;
}

export interface AuditLog {
  id: string;
  audit_record_id: string;
  occurred_at: string | null;
  description: string;
}

export interface CrisisCase {
  id: string;
  code: string;
  title: string;
  organization: string;
  description: string | null;
  classification: string;
  status: string;
}