export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-4 font-[family-name:var(--font-heading)] text-3xl font-extrabold tracking-tight text-white">
        AI Планер
      </h1>
      <p className="mb-8 text-lg text-neutral-400">
        Вивали з голови все, що треба зробити — AI перетворить це на план дня.
      </p>
      <button
        onClick={onStart}
        className="w-full max-w-xs rounded-full bg-accent py-4 text-lg font-semibold text-accent-foreground"
      >
        Почати
      </button>
    </main>
  );
}
