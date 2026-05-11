import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { turfsTable } from "./turfs";
import { teamsTable } from "./teams";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  turfId: integer("turf_id").notNull().references(() => turfsTable.id),
  teamAId: integer("team_a_id").notNull().references(() => teamsTable.id),
  teamBId: integer("team_b_id").notNull().references(() => teamsTable.id),
  overs: integer("overs").notNull().default(10),
  matchType: text("match_type").notNull().default("friendly"),
  matchDate: timestamp("match_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  teamAScore: integer("team_a_score"),
  teamAWickets: integer("team_a_wickets"),
  teamBScore: integer("team_b_score"),
  teamBWickets: integer("team_b_wickets"),
  winnerTeamId: integer("winner_team_id"),
  mvpPlayerId: integer("mvp_player_id").references(() => usersTable.id),
  teamACaptainVerified: boolean("team_a_captain_verified").notNull().default(false),
  teamBCaptainVerified: boolean("team_b_captain_verified").notNull().default(false),
  isSuspicious: boolean("is_suspicious").notNull().default(false),
  suspiciousReason: text("suspicious_reason"),
  bookingId: integer("booking_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;

export const matchParticipationsTable = pgTable("match_participations", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  teamId: integer("team_id").notNull().references(() => teamsTable.id),
  runsScored: integer("runs_scored").notNull().default(0),
  ballsFaced: integer("balls_faced").notNull().default(0),
  wicketsTaken: integer("wickets_taken").notNull().default(0),
  ballsBowled: integer("balls_bowled").notNull().default(0),
  runsGiven: integer("runs_given").notNull().default(0),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMatchParticipationSchema = createInsertSchema(matchParticipationsTable).omit({ id: true, createdAt: true });
export type InsertMatchParticipation = z.infer<typeof insertMatchParticipationSchema>;
export type MatchParticipation = typeof matchParticipationsTable.$inferSelect;
