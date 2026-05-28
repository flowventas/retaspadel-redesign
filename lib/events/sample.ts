import { TournamentEvent } from "@/lib/events/types";

export const sampleEvents: TournamentEvent[] = [
  {
    id: "event-el-dorado-open",
    slug: "torneo-anual-el-dorado-club",
    name: "Torneo Anual El Dorado Club",
    status: "published",
    startsAt: "2026-06-12",
    endsAt: "2026-06-15",
    venue: {
      clubName: "El Dorado Club",
      address: "Av. Principal 450",
      city: "Queretaro",
    },
    description:
      "Base inicial para el nuevo dominio de torneos de 6 loco. Aqui podremos crecer despues a categorias, standings en vivo, brackets y patrocinadores.",
    sponsors: [
      { id: "s1", name: "Patrocinador Principal" },
      { id: "s2", name: "Recovery Partner" },
    ],
    categories: [
      {
        id: "cat-4ta-5ta-mixto",
        name: "4ta / 5ta Mixto",
        format: "round_robin",
        participantCount: 16,
      },
      {
        id: "cat-open-varonil",
        name: "Open Varonil",
        format: "hybrid",
        participantCount: 12,
      },
    ],
    teams: [
      { id: "team-1", playerNames: ["Ana", "Carlos"], categoryId: "cat-4ta-5ta-mixto" },
      { id: "team-2", playerNames: ["Majo", "Santi"], categoryId: "cat-4ta-5ta-mixto" },
      { id: "team-3", playerNames: ["Fer", "Luis"], categoryId: "cat-open-varonil" },
    ],
  },
];

export function getSampleEventBySlug(slug: string) {
  return sampleEvents.find((event) => event.slug === slug) ?? null;
}
