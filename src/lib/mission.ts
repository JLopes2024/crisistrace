import { supabase } from "./supabase";

import type {
  AuditLog,
  AuditRecord,
} from "../types/audit";

export interface MissionState {
  success: boolean;

  unlocked: boolean;

  missionNumber: number;

  mission?: {
    number: number;
    name: string;
  };

  unlockedAt?: string;

  record?: AuditRecord;

  logs?: AuditLog[];

  restrictedEvidenceSelected:
    boolean;

  error?: string;
}

export interface UnlockMissionResult {
  success: boolean;

  code?:
    | "MISSION_UNLOCKED"
    | "ALREADY_UNLOCKED"
    | "INVALID_CODE";

  message?: string;

  mission?: {
    number: number;
    name: string;
  };

  record?: AuditRecord;

  logs?: AuditLog[];

  error?: string;
}

async function invokeMissionFunction<
  T,
>(
  functionName: string,
  body: Record<
    string,
    unknown
  >,
): Promise<T> {
  const {
    data: { session },
  } =
    await supabase.auth
      .getSession();

  if (!session) {
    throw new Error(
      "Sua sessão expirou. Entre novamente.",
    );
  }

  const supabaseUrl =
    import.meta.env
      .VITE_SUPABASE_URL;

  const anonKey =
    import.meta.env
      .VITE_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !anonKey
  ) {
    throw new Error(
      "Configuração do Supabase não encontrada.",
    );
  }

  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${session.access_token}`,

          apikey: anonKey,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            body,
          ),
      },
    );

  let result:
    | T
    | {
        error?: string;
      };

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      "Resposta inválida do servidor.",
    );
  }

  if (!response.ok) {
    const possibleError =
      result as {
        error?: string;
      };

    throw new Error(
      possibleError.error ||
        "Não foi possível concluir a operação.",
    );
  }

  return result as T;
}

export function getMissionState(
  investigationId: string,
) {
  return invokeMissionFunction<
    MissionState
  >(
    "get-mission-state",
    {
      investigationId,
    },
  );
}

export function unlockMission(
  investigationId: string,
  code: string,
) {
  return invokeMissionFunction<
    UnlockMissionResult
  >(
    "unlock-mission",
    {
      investigationId,
      code,
    },
  );
}

export function setRestrictedEvidence(
  investigationId: string,
  selected: boolean,
) {
  return invokeMissionFunction<{
    success: boolean;
    selected: boolean;
    recordId: string;
  }>(
    "toggle-mission-evidence",
    {
      investigationId,
      selected,
    },
  );
}