# Лад — AI-планер дня

Mobile-first застосунок: вивалюєш хаотичний текст думок, AI перетворює його на задачі
(пріоритет, час, дедлайн), а потім за один тап складає реалістичний план на сьогодні.

**Живий продукт:** https://ai-planner-six-swart.vercel.app/

## Сценарій

Brain dump → AI розбирає текст на задачі → Preview для перевірки/правок → Inbox →
«Сформувати план на сьогодні» (AI впорядковує задачі під робочі години).

## Технології

Next.js (App Router, TypeScript) + Tailwind CSS, Anthropic API (Claude Haiku 4.5,
structured tool-use), деплой на Vercel. Задачі зберігаються в localStorage браузера —
без акаунтів і без серверної БД (свідомий компроміс MVP, див. `ROADMAP.md`).

## Запуск локально

```bash
npm install
cp .env.example .env.local   # додати свій ANTHROPIC_API_KEY
npm run dev
```

Без `ANTHROPIC_API_KEY` у `.env.local` AI-функції (розбір тексту, план дня) не
запрацюють — для перевірки продукту простіше відкрити живе посилання вище.
