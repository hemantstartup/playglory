import { Router, type IRouter } from "express";
import { db, usersTable, playerProfilesTable, playerStatsTable, teamMembersTable, matchesTable, teamsTable, needPlayersPostsTable, needPlayersJoinsTable } from "@workspace/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { authenticate } from "../lib/auth";
import {
  ListPlayersQueryParams,
  GetPlayerParams,
  GetPlayerStatsParams,
  UpdateMyProfileBody,
  UpdateAvailabilityBody,
  ListNeedPlayersQueryParams,
  CreateNeedPlayersPostBody,
  JoinNeedPlayersPostParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/players", async (req, res): Promise<void> => {
  const parsed = ListPlayersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { city, role, available, search } = parsed.data;
  const page = parsed.data.page ?? 1;
  const limit = Math.min(parsed.data.limit ?? 20, 50);
  const offset = (page - 1) * limit;

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
        city ? eq(usersTable.city, city) : undefined,
        role ? eq(playerProfilesTable.playerRole, role) : undefined,
        available ? sql`${playerProfilesTable.availabilityStatus} != 'unavailable'` : undefined,
        search ? sql`${usersTable.name} ILIKE ${"%" + search + "%"}` : undefined,
      )
    )
    .limit(limit)
    .offset(offset);

  const teamsCountRows = await db
    .select({ userId: teamMembersTable.userId, count: sql<number>`count(*)` })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.status, "active"))
    .groupBy(teamMembersTable.userId);

  const teamsMap = new Map(teamsCountRows.map(r => [r.userId, Number(r.count)]));

  const players = rows.map(({ user, profile, stats }) => ({
    id: profile?.id ?? 0,
    userId: user.id,
    name: user.name,
    city: user.city,
    avatarUrl: user.avatarUrl,
    playerRole: profile?.playerRole ?? null,
    battingStyle: profile?.battingStyle ?? null,
    bowlingStyle: profile?.bowlingStyle ?? null,
    availabilityStatus: profile?.availabilityStatus ?? null,
    overallRating: profile?.overallRating ?? null,
    battingRating: profile?.battingRating ?? null,
    bowlingRating: profile?.bowlingRating ?? null,
    isVerified: profile?.isVerified ?? false,
    trustScore: profile?.trustScore ?? null,
    fairPlayScore: profile?.fairPlayScore ?? null,
    verifiedMatchPct: profile?.verifiedMatchPct ?? null,
    teamsCount: teamsMap.get(user.id) ?? 0,
    matchesCount: stats?.totalMatches ?? 0,
  }));

  res.json({ players, total: players.length });
});

router.get("/players/me/profile", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [profile] = await db.select().from(playerProfilesTable).where(eq(playerProfilesTable.userId, user.id)).limit(1);
  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, user.id)).limit(1);

  const teamsRows = await db.select({ count: sql<number>`count(*)` }).from(teamMembersTable).where(and(eq(teamMembersTable.userId, user.id), eq(teamMembersTable.status, "active")));

  res.json({
    id: profile?.id ?? 0,
    userId: user.id,
    name: user.name,
    city: user.city,
    avatarUrl: user.avatarUrl,
    playerRole: profile?.playerRole ?? null,
    battingStyle: profile?.battingStyle ?? null,
    bowlingStyle: profile?.bowlingStyle ?? null,
    availabilityStatus: profile?.availabilityStatus ?? null,
    overallRating: profile?.overallRating ?? null,
    battingRating: profile?.battingRating ?? null,
    bowlingRating: profile?.bowlingRating ?? null,
    isVerified: profile?.isVerified ?? false,
    trustScore: profile?.trustScore ?? null,
    fairPlayScore: profile?.fairPlayScore ?? null,
    verifiedMatchPct: profile?.verifiedMatchPct ?? null,
    teamsCount: Number(teamsRows[0]?.count ?? 0),
    matchesCount: stats?.totalMatches ?? 0,
  });
});

router.put("/players/me/profile", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = UpdateMyProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { city, playerRole, battingStyle, bowlingStyle, avatarUrl } = parsed.data;

  if (city || avatarUrl) {
    await db.update(usersTable).set({
      ...(city ? { city } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    }).where(eq(usersTable.id, user.id));
  }

  const [existing] = await db.select().from(playerProfilesTable).where(eq(playerProfilesTable.userId, user.id)).limit(1);
  if (existing) {
    const profileUpdates = {
      ...(playerRole ? { playerRole } : {}),
      ...(battingStyle ? { battingStyle } : {}),
      ...(bowlingStyle ? { bowlingStyle } : {}),
    };
    if (Object.keys(profileUpdates).length > 0) {
      await db.update(playerProfilesTable).set(profileUpdates).where(eq(playerProfilesTable.userId, user.id));
    }
  } else if (playerRole || battingStyle || bowlingStyle) {
    await db.insert(playerProfilesTable).values({ userId: user.id, playerRole, battingStyle, bowlingStyle });
  }

  const [updatedUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  const [profile] = await db.select().from(playerProfilesTable).where(eq(playerProfilesTable.userId, user.id)).limit(1);
  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, user.id)).limit(1);

  res.json({
    id: profile?.id ?? 0,
    userId: updatedUser.id,
    name: updatedUser.name,
    city: updatedUser.city,
    avatarUrl: updatedUser.avatarUrl,
    playerRole: profile?.playerRole ?? null,
    battingStyle: profile?.battingStyle ?? null,
    bowlingStyle: profile?.bowlingStyle ?? null,
    availabilityStatus: profile?.availabilityStatus ?? null,
    overallRating: profile?.overallRating ?? null,
    battingRating: profile?.battingRating ?? null,
    bowlingRating: profile?.bowlingRating ?? null,
    isVerified: profile?.isVerified ?? false,
    trustScore: profile?.trustScore ?? null,
    fairPlayScore: profile?.fairPlayScore ?? null,
    verifiedMatchPct: profile?.verifiedMatchPct ?? null,
    teamsCount: 0,
    matchesCount: stats?.totalMatches ?? 0,
  });
});

router.put("/players/me/availability", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = UpdateAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(playerProfilesTable).where(eq(playerProfilesTable.userId, user.id)).limit(1);
  if (existing) {
    await db.update(playerProfilesTable).set({ availabilityStatus: parsed.data.status }).where(eq(playerProfilesTable.userId, user.id));
  } else {
    await db.insert(playerProfilesTable).values({ userId: user.id, availabilityStatus: parsed.data.status });
  }

  const [profile] = await db.select().from(playerProfilesTable).where(eq(playerProfilesTable.userId, user.id)).limit(1);

  res.json({
    id: profile?.id ?? 0,
    userId: user.id,
    name: user.name,
    city: user.city,
    avatarUrl: user.avatarUrl,
    playerRole: profile?.playerRole ?? null,
    battingStyle: profile?.battingStyle ?? null,
    bowlingStyle: profile?.bowlingStyle ?? null,
    availabilityStatus: profile?.availabilityStatus ?? null,
    overallRating: profile?.overallRating ?? null,
    battingRating: profile?.battingRating ?? null,
    bowlingRating: profile?.bowlingRating ?? null,
    isVerified: profile?.isVerified ?? false,
    trustScore: profile?.trustScore ?? null,
    fairPlayScore: profile?.fairPlayScore ?? null,
    verifiedMatchPct: profile?.verifiedMatchPct ?? null,
    teamsCount: 0,
    matchesCount: 0,
  });
});

router.get("/players/:playerId", async (req, res): Promise<void> => {
  const params = GetPlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { playerId } = params.data;

  const [row] = await db
    .select({ user: usersTable, profile: playerProfilesTable, stats: playerStatsTable })
    .from(usersTable)
    .leftJoin(playerProfilesTable, eq(playerProfilesTable.userId, usersTable.id))
    .leftJoin(playerStatsTable, eq(playerStatsTable.userId, usersTable.id))
    .where(eq(usersTable.id, playerId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const { user, profile, stats } = row;
  const teamsRows = await db.select({ count: sql<number>`count(*)` }).from(teamMembersTable).where(and(eq(teamMembersTable.userId, user.id), eq(teamMembersTable.status, "active")));

  res.json({
    id: profile?.id ?? 0,
    userId: user.id,
    name: user.name,
    city: user.city,
    avatarUrl: user.avatarUrl,
    playerRole: profile?.playerRole ?? null,
    battingStyle: profile?.battingStyle ?? null,
    bowlingStyle: profile?.bowlingStyle ?? null,
    availabilityStatus: profile?.availabilityStatus ?? null,
    overallRating: profile?.overallRating ?? null,
    battingRating: profile?.battingRating ?? null,
    bowlingRating: profile?.bowlingRating ?? null,
    isVerified: profile?.isVerified ?? false,
    trustScore: profile?.trustScore ?? null,
    fairPlayScore: profile?.fairPlayScore ?? null,
    verifiedMatchPct: profile?.verifiedMatchPct ?? null,
    teamsCount: Number(teamsRows[0]?.count ?? 0),
    matchesCount: stats?.totalMatches ?? 0,
  });
});

router.get("/players/:playerId/stats", async (req, res): Promise<void> => {
  const params = GetPlayerStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { playerId } = params.data;
  const [stats] = await db.select().from(playerStatsTable).where(eq(playerStatsTable.userId, playerId)).limit(1);

  if (!stats) {
    res.status(404).json({ error: "Player stats not found" });
    return;
  }

  const strikeRate = stats.totalBallsFaced > 0 ? (stats.totalRuns / stats.totalBallsFaced) * 100 : null;
  const economy = stats.totalBallsBowled > 0 ? (stats.totalRunsGiven / (stats.totalBallsBowled / 6)) : null;
  const winPct = stats.totalMatches > 0 ? (stats.totalWins / stats.totalMatches) * 100 : null;

  const recentMatches = await db
    .select({ match: matchesTable, teamA: teamsTable })
    .from(matchesTable)
    .leftJoin(teamsTable, eq(teamsTable.id, matchesTable.teamAId))
    .where(
      sql`(${matchesTable.teamAId} IN (SELECT team_id FROM team_members WHERE user_id = ${playerId} AND status = 'active')
        OR ${matchesTable.teamBId} IN (SELECT team_id FROM team_members WHERE user_id = ${playerId} AND status = 'active'))`
    )
    .orderBy(desc(matchesTable.matchDate))
    .limit(5);

  res.json({
    playerId,
    totalMatches: stats.totalMatches,
    totalRuns: stats.totalRuns,
    totalWickets: stats.totalWickets,
    strikeRate,
    economy,
    highestScore: stats.highestScore > 0 ? stats.highestScore : null,
    winPercentage: winPct,
    mvpCount: stats.mvpCount,
    verifiedMatchCount: stats.verifiedMatchCount,
    recentMatches: recentMatches.map(({ match }) => ({
      matchId: match.id,
      matchDate: match.matchDate.toISOString(),
      result: match.status,
      teamA: match.teamAId.toString(),
      teamB: match.teamBId.toString(),
      myTeamScore: match.teamAScore ?? null,
      opponentScore: match.teamBScore ?? null,
      isMvp: match.mvpPlayerId === playerId,
    })),
  });
});

// Need Players
router.get("/need-players", async (req, res): Promise<void> => {
  const parsed = ListNeedPlayersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select({ post: needPlayersPostsTable, user: usersTable })
    .from(needPlayersPostsTable)
    .leftJoin(usersTable, eq(usersTable.id, needPlayersPostsTable.userId))
    .where(
      and(
        eq(needPlayersPostsTable.isActive, true),
        parsed.data.city ? eq(needPlayersPostsTable.city, parsed.data.city) : undefined,
      )
    )
    .orderBy(desc(needPlayersPostsTable.createdAt))
    .limit(50);

  res.json(rows.map(({ post, user }) => ({
    id: post.id,
    userId: post.userId,
    userName: user?.name ?? "Unknown",
    title: post.title,
    description: post.description,
    city: post.city,
    sport: post.sport,
    neededCount: post.neededCount,
    joinedCount: post.joinedCount,
    matchDate: post.matchDate?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
  })));
});

router.post("/need-players", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateNeedPlayersPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [post] = await db.insert(needPlayersPostsTable).values({
    userId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    city: parsed.data.city,
    sport: parsed.data.sport ?? "cricket",
    neededCount: parsed.data.neededCount,
    matchDate: parsed.data.matchDate ? new Date(parsed.data.matchDate) : null,
    isActive: true,
  }).returning();

  res.status(201).json({
    id: post.id,
    userId: post.userId,
    userName: user.name,
    title: post.title,
    description: post.description,
    city: post.city,
    sport: post.sport,
    neededCount: post.neededCount,
    joinedCount: post.joinedCount,
    matchDate: post.matchDate?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
  });
});

router.post("/need-players/:postId/join", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = JoinNeedPlayersPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { postId } = params.data;

  const [post] = await db.select().from(needPlayersPostsTable).where(eq(needPlayersPostsTable.id, postId)).limit(1);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  await db.insert(needPlayersJoinsTable).values({ postId, userId: user.id }).onConflictDoNothing();
  await db.update(needPlayersPostsTable).set({ joinedCount: sql`${needPlayersPostsTable.joinedCount} + 1` }).where(eq(needPlayersPostsTable.id, postId));

  const [updatedPost] = await db.select().from(needPlayersPostsTable).where(eq(needPlayersPostsTable.id, postId)).limit(1);
  const [postUser] = await db.select().from(usersTable).where(eq(usersTable.id, updatedPost!.userId)).limit(1);

  res.json({
    id: updatedPost!.id,
    userId: updatedPost!.userId,
    userName: postUser?.name ?? "Unknown",
    title: updatedPost!.title,
    description: updatedPost!.description,
    city: updatedPost!.city,
    sport: updatedPost!.sport,
    neededCount: updatedPost!.neededCount,
    joinedCount: updatedPost!.joinedCount,
    matchDate: updatedPost!.matchDate?.toISOString() ?? null,
    createdAt: updatedPost!.createdAt.toISOString(),
  });
});

export default router;
