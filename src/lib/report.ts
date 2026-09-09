import { supabase } from "./supabase";

import type {
  InvestigationReport,
  ReportFormData,
} from "../types/report";

export async function getOrCreateReport(
  investigationId: string,
) {
  const { data: existing, error: selectError } =
    await supabase
      .from("investigation_reports")
      .select("*")
      .eq("investigation_id", investigationId)
      .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return existing as InvestigationReport;
  }

  const { data, error } = await supabase
    .from("investigation_reports")
    .insert({
      investigation_id: investigationId,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as InvestigationReport;
}

export async function saveReport(
  reportId: string,
  formData: ReportFormData,
) {
  const { data, error } = await supabase
    .from("investigation_reports")
    .update(formData)
    .eq("id", reportId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as InvestigationReport;
}

export async function completeReport(
  reportId: string,
  formData: ReportFormData,
) {
  const { data, error } = await supabase
    .from("investigation_reports")
    .update({
      ...formData,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as InvestigationReport;
}