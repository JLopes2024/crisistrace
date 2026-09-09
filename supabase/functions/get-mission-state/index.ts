import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MISSION_NUMBER = 7;

function jsonResponse(
  body: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Método não permitido.",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Configuração do Supabase incompleta.",
      );
    }

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          error: "Usuário não autenticado.",
        },
        401,
      );
    }

    const userClient =
      createClient(
        supabaseUrl,
        anonKey,
        {
          global: {
            headers: {
              Authorization:
                authorization,
            },
          },
        },
      );

    const {
      data: { user },
      error: userError,
    } =
      await userClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Sessão inválida ou expirada.",
        },
        401,
      );
    }

    let body: {
      investigationId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Requisição inválida.",
        },
        400,
      );
    }

    const investigationId =
      body.investigationId?.trim();

    if (!investigationId) {
      return jsonResponse(
        {
          success: false,
          error:
            "Investigação não informada.",
        },
        400,
      );
    }

    const {
      data: investigation,
      error: investigationError,
    } =
      await userClient
        .from("investigations")
        .select(
          `
          id,
          case_id,
          user_id,
          classroom_session_id
        `,
        )
        .eq("id", investigationId)
        .maybeSingle();

    if (investigationError) {
      throw investigationError;
    }

    if (
      !investigation ||
      investigation.user_id !== user.id
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Investigação não encontrada ou acesso não autorizado.",
        },
        403,
      );
    }

    const admin =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const isProfessors =
      user.email?.toLowerCase() ===
      "professores@renapsisp.org";

    if (
      !isProfessors &&
      !investigation.classroom_session_id
    ) {
      return jsonResponse({
        success: true,
        unlocked: false,
        missionNumber: MISSION_NUMBER,
        restrictedEvidenceSelected: false,
      });
    }

    let unlockQuery =
      admin
        .from("mission_unlocks")
        .select(
          `
          id,
          mission_number,
          classroom_session_id,
          investigation_id,
          unlocked_at
        `,
        )
        .eq(
          "mission_number",
          MISSION_NUMBER,
        );

    if (isProfessors) {
      unlockQuery =
        unlockQuery.eq(
          "investigation_id",
          investigation.id,
        );
    } else {
      unlockQuery =
        unlockQuery.eq(
          "classroom_session_id",
          investigation.classroom_session_id,
        );
    }

    const {
      data: unlock,
      error: unlockError,
    } =
      await unlockQuery.maybeSingle();

    if (unlockError) {
      throw unlockError;
    }

    if (!unlock) {
      return jsonResponse({
        success: true,
        unlocked: false,
        missionNumber: MISSION_NUMBER,
        restrictedEvidenceSelected: false,
      });
    }

    const {
      data: restrictedRecord,
      error: recordError,
    } =
      await admin
        .from(
          "restricted_audit_records",
        )
        .select(
          `
          id,
          case_id,
          record_code,
          mission_number,
          occurred_at,
          platform,
          author,
          title,
          preview,
          content,
          risk_level,
          status,
          reason,
          audit_note,
          tags,
          confidence,
          removal_minutes
        `,
        )
        .eq(
          "case_id",
          investigation.case_id,
        )
        .eq(
          "mission_number",
          MISSION_NUMBER,
        )
        .eq(
          "record_code",
          "AUD-015",
        )
        .maybeSingle();

    if (recordError) {
      throw recordError;
    }

    if (!restrictedRecord) {
      return jsonResponse(
        {
          success: false,
          error:
            "Registro restrito não encontrado.",
        },
        404,
      );
    }

    const [
      logsResult,
      evidenceResult,
    ] =
      await Promise.all([
        admin
          .from(
            "restricted_audit_logs",
          )
          .select(
            `
            id,
            restricted_record_id,
            occurred_at,
            description
          `,
          )
          .eq(
            "restricted_record_id",
            restrictedRecord.id,
          )
          .order(
            "occurred_at",
            {
              ascending: true,
            },
          ),

        admin
          .from(
            "investigation_restricted_evidence",
          )
          .select("id")
          .eq(
            "investigation_id",
            investigation.id,
          )
          .eq(
            "restricted_record_id",
            restrictedRecord.id,
          )
          .maybeSingle(),
      ]);

    if (logsResult.error) {
      throw logsResult.error;
    }

    if (evidenceResult.error) {
      throw evidenceResult.error;
    }

    return jsonResponse({
      success: true,

      unlocked: true,

      missionNumber:
        MISSION_NUMBER,

      mission: {
        number: 7,
        name:
          "Operação Escudo Imprevisto",
      },

      unlockedAt:
        unlock.unlocked_at,

      restrictedEvidenceSelected:
        Boolean(
          evidenceResult.data,
        ),

      record: {
        ...restrictedRecord,
        status: "recovered",
      },

      logs:
        logsResult.data ?? [],
    });
  } catch (error) {
    console.error(
      "get-mission-state:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Não foi possível consultar o estado da missão.",
      },
      500,
    );
  }
});