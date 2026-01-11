// Shared UI tokens to keep styling consistent and easy to tweak.
export const ui = {
  page: {
    shell: "relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950",
    overlay:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.08),transparent_25%)]",
    container: "relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-14 sm:px-10",
    wideContainer: "relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 sm:px-10",
  },
  header: {
    kicker: "text-xs font-semibold uppercase tracking-[0.25em] text-sky-400",
    title: "text-3xl font-bold text-white sm:text-4xl",
    subtitle: "text-base text-slate-200 sm:text-lg",
    backLink: "inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200 transition",
  },
  card: {
    base: "rounded-2xl bg-white/10 backdrop-blur-lg shadow-xl ring-1 ring-white/10",
    padded: "rounded-2xl bg-white/10 backdrop-blur-lg shadow-xl ring-1 ring-white/10 p-6 sm:p-8",
  },
  text: {
    primary: "text-white",
    secondary: "text-slate-200",
    muted: "text-slate-300",
    label: "text-sm font-semibold text-slate-200",
  },
  cta: {
    primary:
      "inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-slate-900 shadow-md transition hover:from-sky-400 hover:to-cyan-300 hover:-translate-y-0.5",
    secondary:
      "inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/15 hover:-translate-y-0.5",
  },
  pill: "inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/15",
  badge: "inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-400/30",
  input:
    "rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/40",
  section: {
    title: "text-xl font-semibold text-white",
    subtitle: "text-sm text-slate-200",
  },
};
