import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
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
        "Content-Type":
          "application/json",
      },
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(
      "ok",
      {
        headers:
          corsHeaders,
      },
    );
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error:
          "Método não permitido.",
      },
      405,
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      );

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
      req.headers.get(
        "Authorization",
      );

    if (!authorization) {
      return jsonResponse(
        {
          success: false,
          error:
            "Usuário não autenticado.",
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
      await userClient.auth
        .getUser();

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
      selected?: boolean;
    };

    try {
      body =
        await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Requisição inválida.",
        },
        400,
      );
    }

    const investigationId =
      body.investigationId
        ?.trim();

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

    if (
      typeof body.selected !==
      "boolean"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Estado da evidência não informado.",
        },
        400,
      );
    }

    /*
     * Confirma acesso à investigação
     * usando RLS.
     */
    const {
      data: investigation,
      error:
        investigationError,
    } =
      await userClient
        .from(
          "investigations",
        )
        .select(
          `
          id,
          case_id,
          user_id,
          classroom_session_id
        `,
        )
        .eq(
          "id",
          investigationId,
        )
        .maybeSingle();

    if (
      investigationError
    ) {
      throw investigationError;
    }

    if (
      !investigation ||
      investigation.user_id !==
        user.id
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
            persistSession:
              false,
            autoRefreshToken:
              false,
          },
        },
      );

    const isProfessors =
      user.email
        ?.toLowerCase() ===
      "professores@renapsisp.org";

    /*
     * Descobre se a Missão 07
     * foi realmente desbloqueada.
     */
    let unlockQuery =
      admin
        .from(
          "mission_unlocks",
        )
        .select("id")
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
      if (
        !investigation
          .classroom_session_id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Sessão de sala inválida.",
          },
          409,
        );
      }

      unlockQuery =
        unlockQuery.eq(
          "classroom_session_id",
          investigation
            .classroom_session_id,
        );
    }

    const {
      data: unlock,
      error: unlockError,
    } =
      await unlockQuery
        .maybeSingle();

    if (unlockError) {
      throw unlockError;
    }

    if (!unlock) {
      return jsonResponse(
        {
          success: false,
          error:
            "A Missão 07 ainda não foi desbloqueada.",
        },
        403,
      );
    }

    /*
     * Localiza AUD-015.
     */
    const {
      data: record,
      error: recordError,
    } =
      await admin
        .from(
          "restricted_audit_records",
        )
        .select(
          `
          id,
          record_code
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

    if (!record) {
      return jsonResponse(
        {
          success: false,
          error:
            "Registro da missão não encontrado.",
        },
        404,
      );
    }

    /*
     * Seleciona.
     */
    if (body.selected) {
      const {
        error: insertError,
      } =
        await admin
          .from(
            "investigation_restricted_evidence",
          )
          .upsert(
            {
              investigation_id:
                investigation.id,

              restricted_record_id:
                record.id,
            },
            {
              onConflict:
                "investigation_id,restricted_record_id",
            },
          );

      if (insertError) {
        throw insertError;
      }
    }

    /*
     * Remove.
     */
    if (!body.selected) {
      const {
        error: deleteError,
      } =
        await admin
          .from(
            "investigation_restricted_evidence",
          )
          .delete()
          .eq(
            "investigation_id",
            investigation.id,
          )
          .eq(
            "restricted_record_id",
            record.id,
          );

      if (deleteError) {
        throw deleteError;
      }
    }

    return jsonResponse({
      success: true,

      selected:
        body.selected,

      recordId:
        record.id,
    });
  } catch (error) {
    console.error(
      "toggle-mission-evidence:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Não foi possível alterar a evidência da missão.",
      },
      500,
    );
  }
});