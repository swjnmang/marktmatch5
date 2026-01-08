import Link from "next/link";

export default function GruppePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
          Gruppe
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Mit Code einer Lobby beitreten
        </h1>
        <p className="text-base text-slate-600">
          Gib den Gruppen-Code ein, den du von der Spielleitung erhalten hast. Du siehst nur die Daten deiner eigenen Gruppe.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <form className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Gruppen-Code
            <input
              type="text"
              name="groupCode"
              placeholder="z.B. GRP-7F2B"
              className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Anzeigename der Gruppe
            <input
              type="text"
              name="groupName"
              placeholder="z.B. Team Alpha"
              className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <p className="text-xs text-slate-500">
            Deine Entscheidungen bleiben privat. Marktanalysen werden nur angezeigt, wenn deine Gruppe sie gekauft hat.
          </p>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            Beitreten (Stub)
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Nach dem Beitritt siehst du hier:
          <ul className="mt-2 list-disc pl-5 text-slate-600">
            <li>Eigenes Kapital, Lager, Maschinen</li>
            <li>Entscheidungsformular pro Periode</li>
            <li>Ergebnisse deiner Gruppe nach Freigabe</li>
          </ul>
        </div>
      </div>

      <Link
        href="/"
        className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
      >
        Zurück zur Startseite
      </Link>
    </main>
  );
}
