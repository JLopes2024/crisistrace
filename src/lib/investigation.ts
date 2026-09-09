import { supabase } from "./supabase";

export interface Investigation {
  id: string;
  case_id: string;
  user_id: string;

  classroom_session_id:
    | string
    | null;

  status:
    | "active"
    | "completed"
    | "archived";

  created_at: string;
  updated_at: string;
}

export async function getOrCreateInvestigation(
  caseId: string,
  classroomSessionId:
    | string
    | null = null,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      "Usuário não autenticado.",
    );
  }

  let query = supabase
    .from("investigations")
    .select("*")
    .eq("case_id", caseId)
    .eq("user_id", user.id);

  if (classroomSessionId) {
    query = query.eq(
      "classroom_session_id",
      classroomSessionId,
    );
  } else {
    query = query.is(
      "classroom_session_id",
      null,
    );
  }

  const {
    data: existing,
    error: selectError,
  } = await query.maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing) {
    return existing as Investigation;
  }

  const { data, error } =
    await supabase
      .from("investigations")
      .insert({
        case_id: caseId,
        user_id: user.id,
        classroom_session_id:
          classroomSessionId,
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data as Investigation;
}

export async function getSelectedEvidence(
  investigationId: string,
) {
  const { data, error } =
    await supabase
      .from(
        "investigation_evidence",
      )
      .select("audit_record_id")
      .eq(
        "investigation_id",
        investigationId,
      );

  if (error) {
    throw error;
  }

  return data.map(
    (item) =>
      item.audit_record_id,
  );
}

export async function selectEvidence(
  investigationId: string,
  auditRecordId: string,
) {
  const { error } =
    await supabase
      .from(
        "investigation_evidence",
      )
      .insert({
        investigation_id:
          investigationId,

        audit_record_id:
          auditRecordId,
      });

  if (error) {
    throw error;
  }
}

export async function removeEvidence(
  investigationId: string,
  auditRecordId: string,
) {
  const { error } =
    await supabase
      .from(
        "investigation_evidence",
      )
      .delete()
      .eq(
        "investigation_id",
        investigationId,
      )
      .eq(
        "audit_record_id",
        auditRecordId,
      );

  if (error) {
    throw error;
  }
}