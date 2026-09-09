import { supabase } from "./supabase";

interface PdfResult {
  blob: Blob;
  filename: string;
}

function getFilename(
  disposition: string | null,
) {
  if (!disposition) {
    return (
      "crisistrace-relatorio.pdf"
    );
  }

  const utf8Match =
    disposition.match(
      /filename\*=UTF-8''([^;]+)/i,
    );

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(
        utf8Match[1],
      );
    } catch {
      return utf8Match[1];
    }
  }

  const regularMatch =
    disposition.match(
      /filename="?([^";]+)"?/i,
    );

  return (
    regularMatch?.[1] ||
    "crisistrace-relatorio.pdf"
  );
}

async function readError(
  response: Response,
) {
  try {
    const data =
      await response.json();

    if (
      data &&
      typeof data.error ===
        "string"
    ) {
      return data.error;
    }
  } catch {
    // tenta texto abaixo
  }

  try {
    const text =
      await response.text();

    if (text) {
      return text;
    }
  } catch {
    // sem conteúdo legível
  }

  return (
    "Não foi possível gerar o PDF."
  );
}

export async function generateInvestigationPdf(
  investigationId: string,
): Promise<PdfResult> {
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

  const response =
    await fetch(
      `${supabaseUrl}/functions/v1/generate-investigation-pdf`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${session.access_token}`,

          apikey:
            anonKey,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            investigationId,
          }),
      },
    );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
      ),
    );
  }

  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .includes(
        "application/pdf",
      )
  ) {
    throw new Error(
      "O servidor não retornou um arquivo PDF.",
    );
  }

  const blob =
    await response.blob();

  if (
    blob.size === 0
  ) {
    throw new Error(
      "O PDF retornado está vazio.",
    );
  }

  const filename =
    getFilename(
      response.headers.get(
        "content-disposition",
      ),
    );

  return {
    blob,
    filename,
  };
}

export function downloadPdf(
  blob: Blob,
  filename: string,
) {
  const url =
    URL.createObjectURL(
      blob,
    );

  const anchor =
    document.createElement(
      "a",
    );

  anchor.href = url;
  anchor.download =
    filename;

  document.body.appendChild(
    anchor,
  );

  anchor.click();

  anchor.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      );
    },
    1000,
  );
}