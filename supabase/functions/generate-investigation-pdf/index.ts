import { createClient } from "npm:@supabase/supabase-js@2";

import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Access-Control-Expose-Headers":
    "Content-Disposition, Content-Type",
};

type ReportRow = {
  id: string;
  investigation_id: string;

  what_happened: string;
  affected_people: string;
  involved_audiences: string;
  data_findings: string;
  causes: string;
  apparent_problem: string;
  real_problem: string;
  initial_diagnosis: string;

  status: string;
  completed_at: string | null;
};

type PdfEvidence = {
  record_code: string;
  platform: string | null;
  author: string | null;
  title: string;
  preview: string | null;
  content: string | null;
  risk_level: string | null;
  status: string;
};

const PERIOD_LABELS: Record<
  string,
  string
> = {
  morning: "Manhã",
  afternoon: "Tarde",
};

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

function pdfSafeText(
  value:
    | string
    | null
    | undefined,
) {
  const text =
    value?.trim() ||
    "Não informado.";

  return text
    .replace(/\r/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(
      /[^\x0A\x0D\x20-\xFF]/g,
      "?",
    );
}

function safeFilename(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-zA-Z0-9_-]+/g,
      "-",
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

Deno.serve(async (req) => {
  if (
    req.method === "OPTIONS"
  ) {
    return new Response(
      "ok",
      {
        headers: corsHeaders,
      },
    );
  }

  if (
    req.method !== "POST"
  ) {
    return jsonResponse(
      {
        error:
          "Método não permitido.",
      },
      405,
    );
  }

  try {
    const authorization =
      req.headers.get(
        "Authorization",
      );

    if (!authorization) {
      return jsonResponse(
        {
          error:
            "Usuário não autenticado.",
        },
        401,
      );
    }

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
      body =
        await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        400,
      );
    }

    const investigationId =
      body.investigationId;

    if (
      !investigationId ||
      typeof investigationId !==
        "string"
    ) {
      return jsonResponse(
        {
          error:
            "Investigação não informada.",
        },
        400,
      );
    }

    const {
      data:
        allowedInvestigation,
      error:
        investigationError,
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
      !allowedInvestigation ||
      allowedInvestigation.user_id !==
        user.id
    ) {
      return jsonResponse(
        {
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

    const [
      caseResult,
      reportResult,
      evidenceResult,
      restrictedEvidenceResult,
      sessionResult,
    ] =
      await Promise.all([
        admin
          .from("cases")
          .select(
            `
            id,
            code,
            title,
            organization,
            classification
          `,
          )
          .eq(
            "id",
            allowedInvestigation
              .case_id,
          )
          .single(),

        admin
          .from(
            "investigation_reports",
          )
          .select("*")
          .eq(
            "investigation_id",
            investigationId,
          )
          .maybeSingle(),

        admin
          .from(
            "investigation_evidence",
          )
          .select(
            `
            selected_at,
            audit_records (
              record_code,
              platform,
              author,
              title,
              preview,
              content,
              risk_level,
              status
            )
          `,
          )
          .eq(
            "investigation_id",
            investigationId,
          ),

        admin
          .from(
            "investigation_restricted_evidence",
          )
          .select(
            `
            selected_at,
            restricted_audit_records (
              record_code,
              platform,
              author,
              title,
              preview,
              content,
              risk_level,
              status
            )
          `,
          )
          .eq(
            "investigation_id",
            investigationId,
          ),

        allowedInvestigation
          .classroom_session_id
          ? admin
              .from(
                "classroom_sessions",
              )
              .select(
                `
                id,
                classroom_id,
                period,
                group_number,
                classrooms (
                  code
                )
              `,
              )
              .eq(
                "id",
                allowedInvestigation
                  .classroom_session_id,
              )
              .maybeSingle()
          : Promise.resolve(
              {
                data: null,
                error: null,
              },
            ),
      ]);

    if (caseResult.error) {
      throw caseResult.error;
    }

    if (reportResult.error) {
      throw reportResult.error;
    }

    if (evidenceResult.error) {
      throw evidenceResult.error;
    }

    if (
      restrictedEvidenceResult.error
    ) {
      throw restrictedEvidenceResult.error;
    }

    if (sessionResult.error) {
      throw sessionResult.error;
    }

    const crisisCase =
      caseResult.data;

    const report =
      reportResult.data as
        ReportRow | null;

    if (!report) {
      return jsonResponse(
        {
          error:
            "O relatório ainda não foi criado.",
        },
        409,
      );
    }

    if (
      report.status !==
      "completed"
    ) {
      return jsonResponse(
        {
          error:
            "Finalize o relatório antes de gerar o PDF.",
        },
        409,
      );
    }

    const session =
      sessionResult.data;

    let identification =
      "PROFESSORES";

    if (session) {
      const classroomRelation =
        session.classrooms as
          | {
              code?: string;
            }
          | {
              code?: string;
            }[]
          | null;

      const classroomCode =
        Array.isArray(
          classroomRelation,
        )
          ? classroomRelation[0]
              ?.code
          : classroomRelation
              ?.code;

      identification =
        `Sala ${
          classroomCode ||
          "?"
        } • ${
          PERIOD_LABELS[
            session.period
          ] ||
          session.period
        } • Grupo ${
          session.group_number
        }`;
    }

    const evidence:
      PdfEvidence[] = [];

    for (
      const item of
      evidenceResult.data ?? []
    ) {
      const relation =
        item.audit_records;

      const record =
        Array.isArray(relation)
          ? relation[0]
          : relation;

      if (record) {
        evidence.push(
          record as PdfEvidence,
        );
      }
    }

    for (
      const item of
      restrictedEvidenceResult.data ??
      []
    ) {
      const relation =
        item.restricted_audit_records;

      const record =
        Array.isArray(relation)
          ? relation[0]
          : relation;

      if (record) {
        evidence.push({
          ...(record as PdfEvidence),

          /*
           * No documento final ele já
           * foi recuperado pela equipe.
           */
          status: "recovered",
        });
      }
    }

    evidence.sort(
      (a, b) =>
        a.record_code.localeCompare(
          b.record_code,
        ),
    );

    const pdf =
      await PDFDocument.create();

    const regular =
      await pdf.embedFont(
        StandardFonts.Helvetica,
      );

    const bold =
      await pdf.embedFont(
        StandardFonts
          .HelveticaBold,
      );

    const pageWidth =
      595.28;

    const pageHeight =
      841.89;

    const margin = 48;

    const contentWidth =
      pageWidth -
      margin * 2;

    const dark =
      rgb(
        0.07,
        0.15,
        0.25,
      );

    const muted =
      rgb(
        0.38,
        0.43,
        0.48,
      );

    const light =
      rgb(
        0.9,
        0.93,
        0.96,
      );

    const white =
      rgb(1, 1, 1);

    let page =
      pdf.addPage([
        pageWidth,
        pageHeight,
      ]);

    let y =
      pageHeight -
      margin;

    function newPage() {
      page =
        pdf.addPage([
          pageWidth,
          pageHeight,
        ]);

      y =
        pageHeight -
        margin;

      page.drawText(
        "CRISISTRACE",
        {
          x: margin,
          y,
          size: 8,
          font: bold,
          color: muted,
        },
      );

      y -= 28;
    }

    function ensureSpace(
      requiredHeight: number,
    ) {
      if (
        y -
          requiredHeight <
        margin
      ) {
        newPage();
      }
    }

    function wrapText(
      rawText: string,
      fontSize: number,
      fontToUse = regular,
      maxWidth =
        contentWidth,
    ) {
      const text =
        pdfSafeText(
          rawText,
        );

      const lines:
        string[] = [];

      const paragraphs =
        text.split("\n");

      for (
        const paragraph of
        paragraphs
      ) {
        const words =
          paragraph.split(
            /\s+/,
          );

        let line = "";

        for (
          const word of words
        ) {
          const candidate =
            line
              ? `${line} ${word}`
              : word;

          const width =
            fontToUse
              .widthOfTextAtSize(
                candidate,
                fontSize,
              );

          if (
            width <=
              maxWidth ||
            !line
          ) {
            line =
              candidate;
          } else {
            lines.push(line);
            line = word;
          }
        }

        if (line) {
          lines.push(line);
        }

        lines.push("");
      }

      if (
        lines[
          lines.length - 1
        ] === ""
      ) {
        lines.pop();
      }

      return lines;
    }

    function drawParagraph(
      text: string,
      options?: {
        size?: number;
        color?: ReturnType<
          typeof rgb
        >;
        font?: typeof regular;
        gap?: number;
      },
    ) {
      const size =
        options?.size ?? 10;

      const fontToUse =
        options?.font ??
        regular;

      const lineHeight =
        size * 1.45;

      const lines =
        wrapText(
          text,
          size,
          fontToUse,
        );

      for (
        const line of lines
      ) {
        ensureSpace(
          lineHeight + 2,
        );

        if (line) {
          page.drawText(
            line,
            {
              x: margin,
              y,
              size,
              font:
                fontToUse,
              color:
                options?.color ??
                dark,
            },
          );
        }

        y -= lineHeight;
      }

      y -=
        options?.gap ?? 8;
    }

    function drawSection(
      number: string,
      title: string,
      content: string,
    ) {
      ensureSpace(80);

      page.drawText(
        number,
        {
          x: margin,
          y,
          size: 8,
          font: bold,
          color: muted,
        },
      );

      y -= 15;

      page.drawText(
        pdfSafeText(title),
        {
          x: margin,
          y,
          size: 13,
          font: bold,
          color: dark,
        },
      );

      y -= 22;

      drawParagraph(
        content,
        {
          size: 10,
          gap: 18,
        },
      );
    }

    page.drawRectangle({
      x: 0,
      y:
        pageHeight -
        180,
      width: pageWidth,
      height: 180,
      color: dark,
    });

    page.drawText(
      "CRISISTRACE",
      {
        x: margin,
        y:
          pageHeight -
          65,
        size: 11,
        font: bold,
        color: white,
      },
    );

    page.drawText(
      "RELATORIO DE IMPACTO RAIO-X",
      {
        x: margin,
        y:
          pageHeight -
          105,
        size: 20,
        font: bold,
        color: white,
      },
    );

    page.drawText(
      pdfSafeText(
        crisisCase.title,
      ),
      {
        x: margin,
        y:
          pageHeight -
          132,
        size: 11,
        font: regular,
        color: light,
      },
    );

    page.drawText(
      pdfSafeText(
        identification,
      ),
      {
        x: margin,
        y:
          pageHeight -
          153,
        size: 9,
        font: bold,
        color: light,
      },
    );

    y =
      pageHeight -
      215;

    drawParagraph(
      `Organização: ${crisisCase.organization}`,
      {
        size: 9,
        color: muted,
        gap: 4,
      },
    );

    drawParagraph(
      `Caso: ${crisisCase.code} • Classificação: ${crisisCase.classification}`,
      {
        size: 9,
        color: muted,
        gap: 22,
      },
    );

    drawSection(
      "01",
      "O que aconteceu?",
      report.what_happened,
    );

    drawSection(
      "02",
      "Quem foi afetado?",
      report.affected_people,
    );

    drawSection(
      "03",
      "Públicos envolvidos",
      report.involved_audiences,
    );

    drawSection(
      "04",
      "O que os dados revelam?",
      report.data_findings,
    );

    drawSection(
      "05",
      "Causas identificadas",
      report.causes,
    );

    drawSection(
      "06",
      "Problema aparente",
      report.apparent_problem,
    );

    drawSection(
      "07",
      "Problema real",
      report.real_problem,
    );

    drawSection(
      "08",
      "Diagnóstico inicial",
      report.initial_diagnosis,
    );

    newPage();

    page.drawText(
      "EVIDENCIAS SELECIONADAS",
      {
        x: margin,
        y,
        size: 16,
        font: bold,
        color: dark,
      },
    );

    y -= 30;

    if (
      evidence.length === 0
    ) {
      drawParagraph(
        "Nenhuma evidência foi selecionada para este relatório.",
        {
          color: muted,
        },
      );
    } else {
      evidence.forEach(
        (
          record,
          index,
        ) => {
          ensureSpace(120);

          page.drawText(
            pdfSafeText(
              `${index + 1}. ${record.record_code}`,
            ),
            {
              x: margin,
              y,
              size: 9,
              font: bold,
              color: muted,
            },
          );

          y -= 17;

          drawParagraph(
            record.title,
            {
              size: 12,
              font: bold,
              gap: 5,
            },
          );

          const metadata =
            [
              record.platform,
              record.author,

              record.risk_level
                ? `Risco: ${record.risk_level}`
                : null,

              record.status
                ? `Status: ${record.status}`
                : null,
            ]
              .filter(Boolean)
              .join(" • ");

          if (metadata) {
            drawParagraph(
              metadata,
              {
                size: 8,
                color: muted,
                gap: 7,
              },
            );
          }

          drawParagraph(
            record.content ||
              record.preview ||
              "Conteúdo não disponível.",
            {
              size: 9,
              gap: 17,
            },
          );

          ensureSpace(12);

          page.drawLine({
            start: {
              x: margin,
              y,
            },

            end: {
              x:
                pageWidth -
                margin,
              y,
            },

            thickness: 0.5,
            color: light,
          });

          y -= 18;
        },
      );
    }

    ensureSpace(60);

    y -= 10;

    const generatedAt =
      new Intl.DateTimeFormat(
        "pt-BR",
        {
          dateStyle: "short",
          timeStyle: "short",
          timeZone:
            "America/Sao_Paulo",
        },
      ).format(
        new Date(),
      );

    drawParagraph(
      `Documento gerado pelo CrisisTrace em ${generatedAt}.`,
      {
        size: 8,
        color: muted,
      },
    );

    const pdfBytes =
      await pdf.save();

    const filename =
      `crisistrace-${safeFilename(
        identification,
      )}-${safeFilename(
        crisisCase.code,
      )}.pdf`;

    return new Response(
      pdfBytes,
      {
        status: 200,
        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "generate-investigation-pdf:",
      error,
    );

    return jsonResponse(
      {
        error:
          "Não foi possível gerar o PDF.",
      },
      500,
    );
  }
});