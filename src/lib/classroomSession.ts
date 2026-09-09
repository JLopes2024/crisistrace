import { supabase } from "./supabase";

export type ClassroomPeriod =
  | "morning"
  | "afternoon";

export type ClassroomSessionStatus =
  | "active"
  | "completed"
  | "ended";

export interface ClassroomSession {
  id: string;
  classroom_id: string;
  user_id: string;

  period: ClassroomPeriod;
  group_number: number;

  status: ClassroomSessionStatus;

  started_at: string;
  ended_at: string | null;

  session_date?: string | null;

  created_at?: string;
  updated_at?: string;
}

export interface StartSessionResult {
  success: boolean;
  message: string;
  session?: ClassroomSession;
}

function getRpcErrorMessage(
  message: string,
) {
  if (
    message.includes(
      "NAO_AUTENTICADO",
    )
  ) {
    return "Sua sessão expirou. Entre novamente.";
  }

  if (
    message.includes(
      "USUARIO_INVALIDO",
    )
  ) {
    return "Não foi possível identificar o usuário.";
  }

  if (
    message.includes(
      "SALA_NAO_ENCONTRADA",
    )
  ) {
    return "Não foi possível identificar a sala vinculada a esta conta.";
  }

  if (
    message.includes(
      "PROFESSORES_NAO_USAM_SESSAO",
    )
  ) {
    return "O acesso PROFESSORES não utiliza seleção de sala.";
  }

  if (
    message.includes(
      "PERIODO_INVALIDO",
    )
  ) {
    return "O período selecionado é inválido.";
  }

  if (
    message.includes(
      "GRUPO_INVALIDO",
    )
  ) {
    return "O grupo selecionado é inválido.";
  }

  if (
    message.includes(
      "FORA_DO_HORARIO_MANHA",
    )
  ) {
    return "O período da manhã está disponível das 08:00 às 12:00.";
  }

  if (
    message.includes(
      "FORA_DO_HORARIO_TARDE",
    )
  ) {
    return "O período da tarde está disponível das 13:00 às 17:00.";
  }

  return "Não foi possível iniciar a investigação.";
}

export async function startClassroomSession(
  period: ClassroomPeriod,
  groupNumber: number,
): Promise<StartSessionResult> {
  const {
    data,
    error,
  } = await supabase.rpc(
    "start_classroom_session",
    {
      p_period: period,
      p_group_number: groupNumber,
    },
  );

  if (error) {
    console.error(
      "Erro na RPC start_classroom_session:",
      error,
    );

    return {
      success: false,
      message:
        getRpcErrorMessage(
          error.message,
        ),
    };
  }

  if (!data) {
    return {
      success: false,
      message:
        "O servidor não retornou os dados da sessão.",
    };
  }

  /*
   * RPC RETURNS classroom_sessions.
   *
   * Dependendo de como o Supabase serializa
   * o retorno, podemos receber o objeto
   * diretamente ou um array com uma linha.
   */
  const session =
    Array.isArray(data)
      ? data[0]
      : data;

  if (
    !session ||
    !session.id
  ) {
    console.error(
      "Resposta inesperada da RPC:",
      data,
    );

    return {
      success: false,
      message:
        "A sessão foi criada, mas o servidor retornou dados inválidos.",
    };
  }

  return {
    success: true,
    message:
      "Investigação iniciada.",
    session:
      session as ClassroomSession,
  };
}

export async function getClassroomSessionById(
  sessionId: string,
) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "classroom_sessions",
      )
      .select("*")
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Erro ao consultar sessão:",
      error,
    );

    throw new Error(
      "Não foi possível consultar a sessão da sala.",
    );
  }

  if (!data) {
    return null;
  }

  return data as ClassroomSession;
}

export function getPeriodLabel(
  period: ClassroomPeriod,
) {
  return period === "morning"
    ? "Manhã"
    : "Tarde";
}