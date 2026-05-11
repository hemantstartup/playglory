import { Router, type IRouter } from "express";
import { db, usersTable, playerProfilesTable, playerStatsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { GetLeaderboardQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats/leaderboard", async (req, res): Promise<void> => {
  const parsed = GetLeaderboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const limit = Math.min(parsed.data.limit ?? 20, 50);

  const rows = await db
    .select({
      user: usersTable,
      profile: playerProfilesTable,
      stats: playerStatsTable,
    })
    .from(usersTable)
    .leftJoin(playerProfilesTable, eq(playerProfilesTable.userId, usersTable.id))
    .leftJoin(playerStatsTable, eq(playerStatsTable.userId, usersTable.id))
    .where(
      and(
        eq(usersTable.role, "player"),
        eq(usersTable.isBanned, false),
        parsed.data.city ? eq(usersTable.city, parsed.data.city) : undefined,
      )
    )
    .orderBy(desc(playerProfilesTable.overallRating))
    .limit(limit);

  res.json(rows.map(({ user, profile, stats }, index) => ({
    rank: index + 1,
    playerId: user.id,
    name: user.name,
    city: user.city,
    avatarUrl: user.avatarUrl,
    overallRating: profile?.overallRating ?? null,
    totalRuns: stats?.totalRuns ?? 0,
    totalWickets: stats?.totalWickets ?? 0,
    matchesPlayed: stats?.totalMatches ?? 0,
    winPct: stats && stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches) * 100 : null,
  })));
});

export default router;
