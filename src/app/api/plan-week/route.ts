import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface CandidateTask {
  id: string;
  title: string;
  priority: string;
  estimatedMinutes: number | null;
  deadline: string | null;
}

interface DayLoad {
  date: string;
  taskCount: number;
  minutes: number;
}

const planWeekTool = {
  name: "record_week_plan",
  description: "Записати призначення дня для кожної задачі-кандидата.",
  input_schema: {
    type: "object" as const,
    properties: {
      assignments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            scheduled_date: {
              type: "string",
              description: "Дата у форматі YYYY-MM-DD, обов'язково з переліку днів тижня.",
            },
          },
          required: ["id", "scheduled_date"],
        },
      },
    },
    required: ["assignments"],
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
  const tasks: CandidateTask[] = Array.isArray(body?.tasks) ? body.tasks : [];
  const weekDates: string[] = Array.isArray(body?.weekDates) ? body.weekDates : [];
  const existingLoad: DayLoad[] = Array.isArray(body?.existingLoad) ? body.existingLoad : [];
  const today = typeof body?.today === "string" ? body.today : weekDates[0] ?? "";

  if (tasks.length === 0 || weekDates.length === 0) {
    return NextResponse.json({ ok: true, assignments: [] });
  }

  const taskLines = tasks
    .map(
      (t) =>
        `- id: ${t.id} | назва: ${t.title} | пріоритет: ${t.priority} | час: ${
          t.estimatedMinutes ?? "невідомо"
        } хв | дедлайн: ${t.deadline ?? "немає"}`,
    )
    .join("\n");

  const loadLines = weekDates
    .map((date) => {
      const load = existingLoad.find((l) => l.date === date);
      return `- ${date}: вже заплановано ${load?.taskCount ?? 0} задач (${load?.minutes ?? 0} хв)`;
    })
    .join("\n");

  const systemPrompt = `Ти асистент, який розподіляє задачі по днях тижня.
Сьогоднішня дата: ${today}.
Дні поточного тижня: ${weekDates.join(", ")}.

Поточне навантаження по днях (уже заплановані задачі, не з цього списку):
${loadLines}

Задачі-кандидати для розподілу (усі ще без дня):
${taskLines}

Правила:
- Використовуй лише дати зі списку днів тижня вище.
- Якщо в задачі є дедлайн і він потрапляє в межі цього тижня — постав дату не пізніше дедлайну.
- Якщо дедлайн уже сьогодні або в минулому — постав на сьогодні (${today}).
- Задачі з вищим пріоритетом (high) став раніше в тижні.
- Намагайся рівномірно розподілити навантаження між днями, враховуючи вже заплановані задачі.
- Признач день для КОЖНОЇ задачі зі списку кандидатів — жодну не пропускай.`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: "Розподіли задачі по днях тижня." }],
      tools: [planWeekTool],
      tool_choice: { type: "tool", name: "record_week_plan" },
    });

    const toolUse = message.content.find(
      (block) => block.type === "tool_use" && block.name === "record_week_plan",
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { ok: false, error: "AI не повернув розподіл" },
        { status: 502 },
      );
    }

    const input = toolUse.input as { assignments?: unknown[] };
    const validIds = new Set(tasks.map((t) => t.id));
    const validDates = new Set(weekDates);

    const assignments = (Array.isArray(input.assignments) ? input.assignments : [])
      .map((raw) => raw as Record<string, unknown>)
      .filter(
        (a): a is { id: string; scheduled_date: string } =>
          typeof a.id === "string" &&
          typeof a.scheduled_date === "string" &&
          validIds.has(a.id) &&
          validDates.has(a.scheduled_date),
      )
      .map((a) => ({ id: a.id, scheduledDate: a.scheduled_date }));

    return NextResponse.json({ ok: true, assignments });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Невідома помилка" },
      { status: 500 },
    );
  }
}
