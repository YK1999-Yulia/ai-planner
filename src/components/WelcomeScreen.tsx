export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight text-neutral-100">
        AI Планер
      </h1>
      <p className="mb-8 text-lg text-neutral-400">
        Вивали з голови все, що треба зробити — AI перетворить це на план дня.
      </p>
      <button
        onClick={onStart}
        className="w-full max-w-xs rounded-2xl bg-neutral-100 py-4 text-lg font-semibold text-neutral-950"
      >
        Почати
      </button>
    </main>
  );
}
