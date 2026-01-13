// Shared UI tokens - Neutrales Grau-Konzept
export const ui = {
  page: {
    shell: "relative min-h-screen overflow-hidden bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200",
    overlay:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,200,200,0.05),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(200,200,200,0.05),transparent_25%)]",
    container: "relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-14 sm:px-10",
    wideContainer: "relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 sm:px-10",
  },
  header: {
    kicker: "text-xs font-semibold uppercase tracking-[0.25em] text-neutral-600",
    title: "text-3xl font-bold text-neutral-800 sm:text-4xl",
    subtitle: "text-base text-neutral-600 sm:text-lg",
    backLink: "inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-800 transition",
  },
  card: {
    base: "rounded-2xl bg-white border-2 border-neutral-300 shadow-md",
    padded: "rounded-2xl bg-white border-2 border-neutral-300 shadow-md p-6 sm:p-8",
  },
  text: {
    primary: "text-neutral-800",
    secondary: "text-neutral-600",
    muted: "text-neutral-500",
    label: "text-sm font-semibold text-neutral-700",
  },
  cta: {
    primary:
      "inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-400 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-neutral-600 hover:-translate-y-0.5",
    secondary:
      "inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-neutral-800 ring-1 ring-neutral-300 transition hover:bg-neutral-50 hover:-translate-y-0.5",
  },
  pill: "inline-flex items-center gap-2 rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-neutral-300",
  badge: "inline-flex items-center gap-2 rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-400",
  input:
    "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-500 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300/50",
  section: {
    title: "text-xl font-semibold text-neutral-800",
    subtitle: "text-sm text-neutral-600",
  },
};
