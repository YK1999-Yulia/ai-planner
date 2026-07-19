import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY не налаштовано на сервері" },
      { status: 500 },
    );
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content:
            "Скажи одним коротким реченням українською, що ти на зв'язку.",
        },
      ],
    });

    const reply = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ");

    return NextResponse.json({ ok: true, reply });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Невідома помилка" },
      { status: 500 },
    );
  }
}
