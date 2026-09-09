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
    // ========================================================
    // 1. CONFIGURAÇÃO
    // ========================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const missionCode =
      Deno.env.get("MISSION_07_CODE");

    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !missionCode
    ) {
      console.error(
        "Secrets obrigatórios não encontrados.",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Configuração do servidor incompleta.",
        },
        500,
      );
    }

    // ========================================================
    // 2. AUTENTICAÇÃO
    // ========================================================

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

    if (userError || !user) {
      return jsonResponse(
        {
          success: false,
          error:
            "Sessão inválida ou expirada.",
        },
        401,
      );
    }

    // ========================================================
    // 3. BODY
    // ========================================================

    let body: {
      investigationId?: string;
      code?: string;
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

    const code =
      body.code?.trim();

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

    if (!code) {
      return jsonResponse(
        {
          success: false,
          error:
            "Informe o código de desbloqueio.",
        },
        400,
      );
    }

    // ========================================================
    // 4. VALIDA SE A INVESTIGAÇÃO PERTENCE AO USUÁRIO
    // ========================================================

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
          classroom_session_id,
          status
        `,
        )
        .eq("id", investigationId)
        .maybeSingle();

    if (investigationError) {
      console.error(
        "Erro ao consultar investigação:",
        investigationError,
      );

      throw investigationError;
    }

    if (!investigation) {
      return jsonResponse(
        {
          success: false,
          error:
            "Investigação não encontrada ou acesso não autorizado.",
        },
        403,
      );
    }

    if (investigation.user_id !== user.id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Você não possui acesso a esta investigação.",
        },
        403,
      );
    }

    // ========================================================
    // 5. VALIDA CÓDIGO
    // ========================================================

    if (code !== missionCode) {
      return jsonResponse(
        {
          success: false,
          code: "INVALID_CODE",
          error:
            "Código de ativação inválido.",
        },
        403,
      );
    }

    // ========================================================
    // 6. CLIENTE ADMIN
    // ========================================================

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

    // ========================================================
    // 7. IDENTIFICA PROFESSORES OU SALA
    // ========================================================

    const email =
      user.email?.toLowerCase() ?? "";

    const isProfessors =
      email ===
      "professores@renapsisp.org";

    if (
      !isProfessors &&
      !investigation.classroom_session_id
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Esta investigação não possui uma sessão de sala válida.",
        },
        409,
      );
    }

    // ========================================================
    // 8. CONFIRMA QUE A SESSÃO REALMENTE PERTENCE AO USUÁRIO
    // ========================================================

    if (
      !isProfessors &&
      investigation.classroom_session_id
    ) {
      const {
        data: classroomSession,
        error: classroomSessionError,
      } =
        await admin
          .from("classroom_sessions")
          .select(
            `
            id,
            user_id,
            status
          `,
          )
          .eq(
            "id",
            investigation.classroom_session_id,
          )
          .maybeSingle();

      if (classroomSessionError) {
        throw classroomSessionError;
      }

      if (
        !classroomSession ||
        classroomSession.user_id !==
          user.id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Sessão de sala inválida.",
          },
          403,
        );
      }
    }

    // ========================================================
    // 9. VERIFICA SE JÁ ESTÁ DESBLOQUEADO
    // ========================================================

    let existingUnlockQuery =
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
      existingUnlockQuery =
        existingUnlockQuery.eq(
          "investigation_id",
          investigation.id,
        );
    } else {
      existingUnlockQuery =
        existingUnlockQuery.eq(
          "classroom_session_id",
          investigation.classroom_session_id,
        );
    }

    const {
      data: existingUnlock,
      error: existingUnlockError,
    } =
      await existingUnlockQuery
        .maybeSingle();

    if (existingUnlockError) {
      throw existingUnlockError;
    }

    // ========================================================
    // 10. CRIA O DESBLOQUEIO
    // ========================================================

    let unlock =
      existingUnlock;

    if (!unlock) {
      const unlockPayload =
        isProfessors
          ? {
              mission_number:
                MISSION_NUMBER,

              classroom_session_id:
                null,

              investigation_id:
                investigation.id,

              unlocked_by:
                user.id,
            }
          : {
              mission_number:
                MISSION_NUMBER,

              classroom_session_id:
                investigation.classroom_session_id,

              investigation_id:
                null,

              unlocked_by:
                user.id,
            };

      const {
        data: insertedUnlock,
        error: insertUnlockError,
      } =
        await admin
          .from("mission_unlocks")
          .insert(unlockPayload)
          .select(
            `
            id,
            mission_number,
            classroom_session_id,
            investigation_id,
            unlocked_at
          `,
          )
          .single();

      if (insertUnlockError) {
        /*
         * Se duas requisições acontecerem
         * praticamente juntas, o índice
         * UNIQUE pode impedir a segunda.
         *
         * Nesse caso buscamos novamente
         * em vez de transformar isso em
         * erro para o usuário.
         */
        if (
          insertUnlockError.code ===
          "23505"
        ) {
          let retryQuery =
            admin
              .from(
                "mission_unlocks",
              )
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
            retryQuery =
              retryQuery.eq(
                "investigation_id",
                investigation.id,
              );
          } else {
            retryQuery =
              retryQuery.eq(
                "classroom_session_id",
                investigation.classroom_session_id,
              );
          }

          const {
            data: retryUnlock,
            error: retryError,
          } =
            await retryQuery.single();

          if (retryError) {
            throw retryError;
          }

          unlock =
            retryUnlock;
        } else {
          throw insertUnlockError;
        }
      } else {
        unlock =
          insertedUnlock;
      }
    }

    // ========================================================
    // 11. BUSCA AUD-015
    // ========================================================

    const {
      data: restrictedRecord,
      error: restrictedRecordError,
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

    if (restrictedRecordError) {
      throw restrictedRecordError;
    }

    if (!restrictedRecord) {
      return jsonResponse(
        {
          success: false,
          error:
            "Registro restrito da missão não encontrado.",
        },
        404,
      );
    }

    // ========================================================
    // 12. BUSCA LOGS
    // ========================================================

    const {
      data: logs,
      error: logsError,
    } =
      await admin
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
        );

    if (logsError) {
      throw logsError;
    }

    // ========================================================
    // 13. RESPOSTA
    // ========================================================

    return jsonResponse({
      success: true,

      code: existingUnlock
        ? "ALREADY_UNLOCKED"
        : "MISSION_UNLOCKED",

      message: existingUnlock
        ? "A Missão 07 já estava desbloqueada."
        : "Operação Escudo Imprevisto ativada.",

      mission: {
        number: 7,
        name:
          "Operação Escudo Imprevisto",
      },

      unlock,

      record: {
        ...restrictedRecord,

        /*
         * Para a interface, depois do
         * desbloqueio o registro passa
         * a ser apresentado como
         * recuperado.
         *
         * O banco continua mantendo
         * status='restricted'.
         */
        status: "recovered",
      },

      logs: logs ?? [],
    });
  } catch (error) {
    console.error(
      "unlock-mission:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Não foi possível ativar a missão.",
      },
      500,
    );
  }
});