import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { todayString } from "@/lib/date";
import type { ParsedTaskDraft } from "@/lib/types";

const MAX_TEXT_LENGTH = 4000;

const recordTasksTool = {
  name: "record_tasks",
  description: "Записати список задач, розпізнаних у тексті користувача.",
  input_schema: {
    type: "object" as const,
    properties: {
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Коротка назва задачі, тією ж мовою, що й текст користувача.",
            },
            source_text: {
              type: "string",
              description: "Фрагмент оригінального тексту, з якого зроблено цю задачу.",
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low", "none"],
            },
            estimated_minutes: {
              type: "number",
              description: "Орієнтовна тривалість задачі в хвилинах.",
            },
            deadline: {
              type: "string",
              description:
                "Дедлайн у форматі YYYY-MM-DD — коли задача МАЄ БУТИ ГОТОВА (фрази на кшталт 'до п'ятниці', 'не пізніше вечора'). Порожній рядок, якщо дедлайну немає.",
            },
            scheduled_date: {
              type: "string",
              description:
                "Дата у форматі YYYY-MM-DD — коли користувач планує ЦЕ РОБИТИ (фрази на кшталт 'в середу подзвонити', 'завтра купити'). Порожній рядок, якщо день виконання явно не вказано.",
            },
          },
          required: [
            "title",
            "source_text",
            "priority",
            "estimated_minutes",
            "deadline",
            "scheduled_date",
          ],
        },
      },
    },
    required: ["tasks"],
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
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Порожній текст" },
      { status: 400 },
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `Текст задовгий (максимум ${MAX_TEXT_LENGTH} символів)` },
      { status: 400 },
    );
  }

  const today = todayString();

  const systemPrompt = `Ти асистент, який перетворює хаотичний текст користувача на список окремих задач.
Сьогоднішня дата: ${today}.

Важливо розрізняти два РІЗНІ поняття:
- deadline — коли задача МАЄ БУТИ ГОТОВА ("до п'ятниці", "не пізніше вечора", "максимум до понеділка").
- scheduled_date — коли користувач ПЛАНУЄ ЦЕ РОБИТИ ("в середу подзвонити", "завтра купити", "у четвер дзвінок").
Це не одне й те саме: задача може мати дедлайн без конкретного дня виконання, день виконання без дедлайну, або й обидва одразу.

Правила:
- Розбий текст на окремі, конкретні задачі.
- Для кожної задачі визнач priority: "high", "medium", "low", або "none", якщо пріоритет не зрозумілий з тексту.
- Оціни, скільки хвилин орієнтовно займе задача (число більше нуля).
- deadline: якщо в тексті явно сказано, до якого моменту задача має бути готова — переведи у дату YYYY-MM-DD відносно сьогоднішньої дати. Інакше — порожній рядок.
- scheduled_date: якщо в тексті явно названо день, коли користувач збирається це зробити ("завтра", "у середу") — переведи у дату YYYY-MM-DD (якщо названий день тижня вже минув цього тижня, бери найближчий такий день наступного тижня). Інакше — порожній рядок.
- title пиши тією ж мовою, якою написаний текст користувача.
- Якщо в тексті взагалі немає задач — поверни порожній список tasks.`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
      tools: [recordTasksTool],
      tool_choice: { type: "tool", name: "record_tasks" },
    });

    const toolUse = message.content.find(
      (block) => block.type === "tool_use" && block.name === "record_tasks",
    );

    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(
        { ok: false, error: "AI не повернув розпізнані задачі" },
        { status: 502 },
      );
    }

    const input = toolUse.input as { tasks?: unknown[] };
    const rawTasks = Array.isArray(input.tasks) ? input.tasks : [];

    const tasks: ParsedTaskDraft[] = rawTasks.map((raw): ParsedTaskDraft => {
      const t = raw as Record<string, unknown>;
      return {
        title: typeof t.title === "string" ? t.title : "",
        sourceText: typeof t.source_text === "string" ? t.source_text : "",
        priority:
          t.priority === "high" || t.priority === "medium" || t.priority === "low"
            ? t.priority
            : "none",
        estimatedMinutes:
          typeof t.estimated_minutes === "number" && t.estimated_minutes > 0
            ? Math.round(t.estimated_minutes)
            : null,
        deadline:
          typeof t.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline)
            ? t.deadline
            : null,
        scheduledDate:
          typeof t.scheduled_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.scheduled_date)
            ? t.scheduled_date
            : null,
      };
    }).filter((t) => t.title.length > 0);

    return NextResponse.json({ ok: true, tasks });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Невідома помилка" },
      { status: 500 },
    );
  }
}
