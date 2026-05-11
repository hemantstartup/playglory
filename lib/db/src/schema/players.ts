import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const playerProfilesTable = pgTable("player_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  playerRole: text("player_role"),
  battingStyle: text("batting_style"),
  bowlingStyle: text("bowling_style"),
  availabilityStatus: text("availability_status").default("unavailable"),
  overallRating: real("overall_rating"),
  battingRating: real("batting_rating"),
  bowlingRating: real("bowling_rating"),
  trustScore: real("trust_score").default(100),
  fairPlayScore: real("fair_play_score").default(100),
  verifiedMatchPct: real("verified_match_pct").default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  reportCount: integer("report_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlayerProfileSchema = createInsertSchema(playerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type PlayerProfile = typeof playerProfilesTable.$inferSelect;

export const playerStatsTable = pgTable("player_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => usersTable.id),
  totalMatches: integer("total_matches").notNull().default(0),
  totalRuns: integer("total_runs").notNull().default(0),
  totalWickets: integer("total_wickets").notNull().default(0),
  highestScore: integer("highest_score").notNull().default(0),
  totalBallsFaced: integer("total_balls_faced").notNull().default(0),
  totalBallsBowled: integer("total_balls_bowled").notNull().default(0),
  totalRunsGiven: integer("total_runs_given").notNull().default(0),
  totalWins: integer("total_wins").notNull().default(0),
  mvpCount: integer("mvp_count").notNull().default(0),
  verifiedMatchCount: integer("verified_match_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlayerStatsSchema = createInsertSchema(playerStatsTable).omit({ id: true, updatedAt: true });
export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type PlayerStats = typeof playerStatsTable.$inferSelect;

export const needPlayersPostsTable = pgTable("need_players_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  city: text("city").notNull(),
  sport: text("sport").notNull().default("cricket"),
  neededCount: integer("needed_count").notNull().default(1),
  joinedCount: integer("joined_count").notNull().default(0),
  matchDate: timestamp("match_date", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNeedPlayersPostSchema = createInsertSchema(needPlayersPostsTable).omit({ id: true, createdAt: true });
export type InsertNeedPlayersPost = z.infer<typeof insertNeedPlayersPostSchema>;
export type NeedPlayersPost = typeof needPlayersPostsTable.$inferSelect;

export const needPlayersJoinsTable = pgTable("need_players_joins", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => needPlayersPostsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});
