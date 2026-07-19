"use client";

import { useState } from "react";
import { setUserName } from "@/lib/profile-storage";

export function WelcomeScreen({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");

  function finish() {
    setUserName(name);
    onFinish();
  }

  if (step === 2) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 font-[family-name:var(--font-heading)] text-2xl font-extrabold text-white">
          Як тебе звати?
        </h1>
        <p className="mb-6 text-neutral-400">Щоб я міг звертатись до тебе особисто</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ім'я"
          autoFocus
          className="mb-6 w-full max-w-xs rounded-2xl bg-card px-4 py-3 text-center text-lg text-white outline-none placeholder:text-neutral-500"
        />
        <button
          onClick={finish}
          className="w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground"
        >
          {name.trim() ? "Далі" : "Пропустити"}
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-4 font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight text-white">
        AI Планер
      </h1>
      <p className="mb-8 text-lg text-neutral-400">
        Поділись усім, що тримаєш у голові — я перетворю це на чіткий план
        твого дня.
      </p>
      <button
        onClick={() => setStep(2)}
        className="w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground"
      >
        Почати
      </button>
    </main>
  );
}
