export type EventStatus = "draft" | "published" | "in_progress" | "completed";

export type EventFormat = "round_robin" | "single_elimination" | "hybrid";

export type EventSponsor = {
  id: string;
  name: string;
};

export type EventVenue = {
  clubName: string;
  address: string;
  city: string;
};

export type EventCategory = {
  id: string;
  name: string;
  format: EventFormat;
  participantCount: number;
};

export type EventTeam = {
  id: string;
  playerNames: [string, string] | [string];
  categoryId: string;
};

export type TournamentEvent = {
  id: string;
  slug: string;
  name: string;
  status: EventStatus;
  startsAt: string;
  endsAt: string;
  venue: EventVenue;
  description: string;
  sponsors: EventSponsor[];
  categories: EventCategory[];
  teams: EventTeam[];
};
