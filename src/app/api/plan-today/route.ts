import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface CandidateTask {
  id: string;
  title: string;
  priority: string;
  estimatedMinutes: number | null;
  deadline: string | null;
  overdue?: boolean;
}

const planTodayTool = {
  name: "record_plan",
  description: "Записати впорядкований список id обраних задач для плану на сьогодні.",
  input_schema: {
    type: "object" as const,
    properties: {
      ordered_task_ids: {
        type: "array",
        items: { type: "string" },
        description: "Id задач у порядку, в якому їх варто виконувати сьогодні.",
      },
    },
    required: ["ordered_task_ids"],
  },
};

function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

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
  const dayStart = typeof body?.dayStart === "string" ? body.dayStart : "09:00";
  const dayEnd = typeof body?.dayEnd === "string" ? body.dayEnd : "18:00";

  if (tasks.length === 0) {
    return NextResponse.json({ ok: true, orderedTaskIds: [] });
  }

  // The server's clock (UTC on Vercel) can be a day off from the user's local
  // calendar day, so "today" must come from the client — never computed here.
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : null;

  if (!today) {
    return NextResponse.json(
      { ok: false, error: "Не вказано поточну дату" },
      { status: 400 },
    );
  }

  const availableMinutes = Math.max(minutesBetween(dayStart, dayEnd), 0);

  const taskLines = tasks
    .map(
      (t) =>
        `- id: ${t.id} | назва: ${t.title} | пріоритет: ${t.priority} | час: ${
          t.estimatedMinutes ?? "невідомо"
        } хв | дедлайн: ${t.deadline ?? "немає"}${t.overdue ? " | ПРОСТРОЧЕНО (з минулого дня)" : ""}`,
    )
    .join("\n");

  const hasOverdue = tasks.some((t) => t.overdue);

  const systemPrompt = `Ти асистент, який упорядковує задачі, вже заплановані на сьогодні, у реалістичний план дня.
Сьогоднішня дата: ${today}.
Робочий день: з ${dayStart} до ${dayEnd} (це приблизно ${availableMinutes} хвилин).

Список задач, які треба впорядкувати (усі вже точно заплановані на сьогодні або перенесені з минулих днів):
${taskLines}

Правила:
- Впорядкуй ці задачі так, як їх розумно виконувати протягом дня (важливіші й терміновіші — раніше).${
    hasOverdue
      ? "\n- Задачі, позначені як ПРОСТРОЧЕНО, вважай терміновішими: за інших рівних умов (однаковий пріоритет) став їх РАНІШЕ у списку, ніж звичайні сьогоднішні задачі."
      : ""
  }
- ОБОВ'ЯЗКОВО включи кожну задачу зі списку — нічого не пропускай і не вигадуй нових id.
- Якщо сумарний час не поміщається в робочий день — все одно впорядкуй усі задачі, користувач сам побачить попередження про перевантаження.`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: "Склади план на сьогодні." }],
      tools: [planTodayTool],
      tool_choice: { type: "tool", name: "record_plan" },
    });

    const toolUse = message.content.find(
      (block) => block.type === "tool_use" && block.name === "record_plan",
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { ok: false, error: "AI не повернув план" },
        { status: 502 },
      );
    }

    const input = toolUse.input as { ordered_task_ids?: unknown[] };
    const validIds = new Set(tasks.map((t) => t.id));
    const orderedTaskIds = (
      Array.isArray(input.ordered_task_ids) ? input.ordered_task_ids : []
    ).filter((id): id is string => typeof id === "string" && validIds.has(id));

    // Safety net: if the model dropped any task, append the missing ones at the end
    // so a task can never silently disappear from the day's plan.
    const missing = tasks.map((t) => t.id).filter((id) => !orderedTaskIds.includes(id));

    return NextResponse.json({ ok: true, orderedTaskIds: [...orderedTaskIds, ...missing] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Невідома помилка" },
      { status: 500 },
    );
  }
}
