import { TournamentView } from "@/components/tournament-view";

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <TournamentView tournamentId={id} />;
}
