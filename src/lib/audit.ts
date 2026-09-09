import { supabase } from "./supabase";

import type {
  AuditLog,
  AuditRecord,
  CrisisCase,
} from "../types/audit";

export async function getActiveCase() {
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "active")
    .limit(1)
    .single();

  if (error) {
    throw error;
  }

  return data as CrisisCase;
}

export async function getAuditRecords(
  caseId: string,
) {
  const { data, error } = await supabase
    .from("audit_records")
    .select("*")
    .eq("case_id", caseId)
    .order("occurred_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data as AuditRecord[];
}

export async function getAuditLogs(
  recordId: string,
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("audit_record_id", recordId)
    .order("occurred_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data as AuditLog[];
}