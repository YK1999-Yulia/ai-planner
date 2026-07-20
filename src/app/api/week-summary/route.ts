import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface WeekTask {
  id: string;
  title: string;
  priority: string;
  estimatedMinutes: number | null;
  deadline: string | null;
  scheduledDate: string;
}

const weekSummaryTool = {
  name: "record_week_summary",
  description: "Записати коротке людське резюме тижня.",
  input_schema: {
    type: "object" as const,
    properties: {
      summary: {
        type: "string",
        description: "1-2 речення природною мовою про головне цього тижня і загальну картину.",
      },
    },
    required: ["summary"],
  },
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY не налаштовано на сервері" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const tasks: WeekTask[] = Array.isArray(body?.tasks) ? body.tasks : [];
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : null;

  if (!today) {
    return NextResponse.json(
      { ok: false, error: "Не вказано поточну дату" },
      { status: 400 },
    );
  }

  if (tasks.length === 0) {
    return NextResponse.json({ ok: true, summary: "" });
  }

  const taskLines = tasks
    .map(
      (t) =>
        `- ${t.title} | пріоритет: ${t.priority} | день: ${t.scheduledDate}${
          t.deadline ? ` | дедлайн: ${t.deadline}` : ""
        } | час: ${t.estimatedMinutes ?? "невідомо"} хв`,
    )
    .join("\n");

  const systemPrompt = `Ти асистент, який пише дуже коротке людське резюме тижня користувача.
Сьогоднішня дата: ${today}.

Задачі цього тижня:
${taskLines}

Напиши 1-2 речення природною українською мовою: що головне цього тижня (найважливіші задачі, дедлайни), і загальну картину (скільки ще дрібних справ, приблизно скільки часу). Тон дружній, розмовний, без канцеляриту.
Приклад тону: "Головне цього тижня — доробити презентацію до п'ятниці. Ще на горизонті: 2 дзвінки і кілька дрібних справ (~6 год загалом)".`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: "Напиши резюме тижня." }],
      tools: [weekSummaryTool],
      tool_choice: { type: "tool", name: "record_week_summary" },
    });

    const toolUse = message.content.find(
      (block) => block.type === "tool_use" && block.name === "record_week_summary",
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { ok: false, error: "AI не повернув резюме" },
        { status: 502 },
      );
    }

    const input = toolUse.input as { summary?: unknown };
    const summary = typeof input.summary === "string" ? input.summary : "";

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Невідома помилка" },
      { status: 500 },
    );
  }
}
