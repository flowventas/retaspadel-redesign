import Link from "next/link";
import { TournamentEventView } from "@/components/events/tournament-event-view";
import { getSampleEventBySlug } from "@/lib/events/sample";

type TournamentEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TournamentEventPage({ params }: TournamentEventPageProps) {
  const { slug } = await params;
  const event = getSampleEventBySlug(slug);

  if (!event) {
    return (
      <main className="min-h-screen bg-[var(--app-bg)] px-4 py-10 text-[var(--app-text)]">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-8 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.4)]">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--brand-secondary)]">
            Torneo no encontrado
          </p>
          <h1 className="mt-3 text-3xl font-black text-[var(--app-text)]">No pudimos cargar este torneo.</h1>
          <Link
            href="/torneos"
            className="mt-6 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white"
          >
            Volver a torneos
          </Link>
        </div>
      </main>
    );
  }

  return <TournamentEventView event={event} />;
}
