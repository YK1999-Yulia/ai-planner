"use client";

import { useState } from "react";
import { setUserName } from "@/lib/profile-storage";
import { vibrate } from "@/lib/haptics";
import { TAP_ACTIVE } from "@/lib/ui";

export function WelcomeScreen({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");

  function finish() {
    vibrate(10);
    setUserName(name);
    onFinish();
  }

  if (step === 2) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center animate-[pageFade_0.15s_ease-out]">
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
          className={`w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground ${TAP_ACTIVE}`}
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
        onClick={() => {
          vibrate(10);
          setStep(2);
        }}
        className={`w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground ${TAP_ACTIVE}`}
      >
        Почати
      </button>
    </main>
  );
}
