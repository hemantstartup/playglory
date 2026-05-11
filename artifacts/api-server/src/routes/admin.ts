import { Router, type IRouter } from "express";
import { db, usersTable, matchesTable, turfsTable, bookingsTable, notificationsTable } from "@workspace/db";
import { teamsTable, teamMembersTable, needPlayersPostsTable } from "@workspace/db";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import {
  AdminListUsersQueryParams,
  AdminBanUserParams,
  AdminBanUserBody,
  AdminListTurfsQueryParams,
  AdminVerifyTurfParams,
  AdminVerifyTurfBody,
  AdminListMatchesQueryParams,
  AdminFlagMatchParams,
  AdminFlagMatchBody,
  AdminListBookingsQueryParams,
  AdminCancelBookingParams as AdminCancelBookingPathParams,
  AdminListTeamsQueryParams,
  AdminListFeedQueryParams,
  AdminDeleteFeedPostParams as AdminDeleteFeedPostPathParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/dashboard", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsersRow] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalPlayersRow] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "player"));
  const [totalTurfOwnersRow] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "turf_owner"));
  const [totalMatchesRow] = await db.select({ count: sql<number>`count(*)` }).from(matchesTable);
  const [verifiedMatchesRow] = await db.select({ count: sql<number>`count(*)` }).from(matchesTable).where(eq(matchesTable.status, "verified"));
  const [suspiciousMatchesRow] = await db.select({ count: sql<number>`count(*)` }).from(matchesTable).where(eq(matchesTable.isSuspicious, true));
  const [totalBookingsRow] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable);
  const [confirmedBookingsRow] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "confirmed"));
  const [totalTurfsRow] = await db.select({ count: sql<number>`count(*)` }).from(turfsTable);
  const [pendingTurfsRow] = await db.select({ count: sql<number>`count(*)` }).from(turfsTable).where(eq(turfsTable.verificationStatus, "pending"));
  const [totalTeamsRow] = await db.select({ count: sql<number>`count(*)` }).from(teamsTable);

  const confirmedBookings = await db.select({ amount: bookingsTable.totalAmount }).from(bookingsTable).where(eq(bookingsTable.status, "confirmed"));
  const revenueEstimate = confirmedBookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  const recentMatches = await db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)).limit(3);
  const recentUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(3);
  const recentBookings = await db
    .select({ booking: bookingsTable, turf: turfsTable, user: usersTable })
    .from(bookingsTable)
    .leftJoin(turfsTable, eq(turfsTable.id, bookingsTable.turfId))
    .leftJoin(usersTable, eq(usersTable.id, bookingsTable.userId))
    .orderBy(desc(bookingsTable.createdAt))
    .limit(3);

  const recentActivity = [
    ...recentMatches.map((m, i) => ({
      id: i + 1,
      type: "match",
      description: `Match #${m.id} created (${m.status})`,
      createdAt: m.createdAt.toISOString(),
    })),
    ...recentUsers.map((u, i) => ({
      id: i + 10,
      type: "user",
      description: `New ${u.role.replace("_", " ")} registered: ${u.name}`,
      createdAt: u.createdAt.toISOString(),
    })),
    ...recentBookings.map(({ booking, turf, user }, i) => ({
      id: i + 20,
      type: "booking",
      description: `${user?.name ?? "User"} booked ${turf?.name ?? "turf"} for ₹${booking.totalAmount}`,
      createdAt: booking.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  res.json({
    totalUsers: Number(totalUsersRow?.count ?? 0),
    totalPlayers: Number(totalPlayersRow?.count ?? 0),
    totalTurfOwners: Number(totalTurfOwnersRow?.count ?? 0),
    totalMatches: Number(totalMatchesRow?.count ?? 0),
    verifiedMatches: Number(verifiedMatchesRow?.count ?? 0),
    suspiciousMatches: Number(suspiciousMatchesRow?.count ?? 0),
    totalBookings: Number(totalBookingsRow?.count ?? 0),
    confirmedBookings: Number(confirmedBookingsRow?.count ?? 0),
    totalTurfs: Number(totalTurfsRow?.count ?? 0),
    pendingTurfs: Number(pendingTurfsRow?.count ?? 0),
    totalTeams: Number(totalTeamsRow?.count ?? 0),
    revenueEstimate,
    recentActivity,
  });
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const page = parsed.data.page ?? 1;
  const limit = Math.min(parsed.data.limit ?? 20, 100);
  const offset = (page - 1) * limit;

  const users = await db.select().from(usersTable).where(
    and(
      parsed.data.role ? eq(usersTable.role, parsed.data.role) : undefined,
      parsed.data.search ? sql`${usersTable.name} ILIKE ${"%" + parsed.data.search + "%"}` : undefined,
    )
  ).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);

  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(
    and(
      parsed.data.role ? eq(usersTable.role, parsed.data.role) : undefined,
      parsed.data.search ? sql`${usersTable.name} ILIKE ${"%" + parsed.data.search + "%"}` : undefined,
    )
  );

  res.json({
    users: users.map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      city: u.city,
      avatarUrl: u.avatarUrl,
      isBanned: u.isBanned,
      isVerified: u.isVerified,
      createdAt: u.createdAt.toISOString(),
    })),
    total: Number(totalRow?.count ?? 0),
  });
});

router.patch("/admin/users/:userId/ban", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminBanUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdminBanUserBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [user] = await db.update(usersTable)
    .set({ isBanned: body.data.isBanned, banReason: body.data.reason })
    .where(eq(usersTable.id, params.data.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    city: user.city,
    avatarUrl: user.avatarUrl,
    isBanned: user.isBanned,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
  });
});

router.get("/admin/turfs", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListTurfsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select({ turf: turfsTable, owner: usersTable })
    .from(turfsTable)
    .leftJoin(usersTable, eq(usersTable.id, turfsTable.ownerId))
    .where(parsed.data.status ? eq(turfsTable.verificationStatus, parsed.data.status) : undefined)
    .orderBy(desc(turfsTable.createdAt))
    .limit(100);

  res.json(rows.map(({ turf, owner }) => ({
    id: turf.id,
    ownerId: turf.ownerId,
    ownerName: owner?.name ?? "Unknown",
    name: turf.name,
    city: turf.city,
    address: turf.address,
    sports: turf.sports,
    pricePerHour: turf.pricePerHour,
    openTime: turf.openTime,
    closeTime: turf.closeTime,
    photos: turf.photos,
    verificationStatus: turf.verificationStatus,
    isActive: turf.isActive,
    createdAt: turf.createdAt.toISOString(),
  })));
});

router.patch("/admin/turfs/:turfId/verify", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminVerifyTurfParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdminVerifyTurfBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [turf] = await db.update(turfsTable)
    .set({ verificationStatus: body.data.status, verificationNotes: body.data.notes })
    .where(eq(turfsTable.id, params.data.turfId))
    .returning();

  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, turf.ownerId)).limit(1);

  res.json({
    id: turf.id,
    ownerId: turf.ownerId,
    ownerName: owner?.name ?? "Unknown",
    name: turf.name,
    city: turf.city,
    address: turf.address,
    sports: turf.sports,
    pricePerHour: turf.pricePerHour,
    openTime: turf.openTime,
    closeTime: turf.closeTime,
    photos: turf.photos,
    verificationStatus: turf.verificationStatus,
    isActive: turf.isActive,
    createdAt: turf.createdAt.toISOString(),
  });
});

router.get("/admin/matches", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListMatchesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const teamA = db.$with("teamA").as(db.select().from(teamsTable));
  const teamB = db.$with("teamB").as(db.select().from(teamsTable));

  const rows = await db
    .select({ match: matchesTable, turf: turfsTable })
    .from(matchesTable)
    .leftJoin(turfsTable, eq(turfsTable.id, matchesTable.turfId))
    .where(
      and(
        parsed.data.suspicious ? eq(matchesTable.isSuspicious, true) : undefined,
        parsed.data.status ? eq(matchesTable.status, parsed.data.status) : undefined,
      )
    )
    .orderBy(desc(matchesTable.matchDate))
    .limit(100);

  // Batch-fetch team names
  const teamIds = [...new Set(rows.flatMap(r => [r.match.teamAId, r.match.teamBId]))];
  const teams = teamIds.length > 0
    ? await db.select({ id: teamsTable.id, name: teamsTable.name }).from(teamsTable).where(sql`${teamsTable.id} = ANY(ARRAY[${sql.raw(teamIds.join(","))}]::int[])`)
    : [];
  const teamMap = new Map(teams.map(t => [t.id, t.name]));

  res.json(rows.map(({ match, turf }) => ({
    id: match.id,
    turfId: match.turfId,
    turfName: turf?.name ?? "",
    teamAId: match.teamAId,
    teamAName: teamMap.get(match.teamAId) ?? `Team #${match.teamAId}`,
    teamBId: match.teamBId,
    teamBName: teamMap.get(match.teamBId) ?? `Team #${match.teamBId}`,
    overs: match.overs,
    matchType: match.matchType,
    matchDate: match.matchDate.toISOString(),
    status: match.status,
    teamAScore: match.teamAScore,
    teamAWickets: match.teamAWickets,
    teamBScore: match.teamBScore,
    teamBWickets: match.teamBWickets,
    winnerTeamId: match.winnerTeamId,
    mvpPlayerId: match.mvpPlayerId,
    mvpPlayerName: null,
    teamACaptainVerified: match.teamACaptainVerified,
    teamBCaptainVerified: match.teamBCaptainVerified,
    isSuspicious: match.isSuspicious,
    bookingId: match.bookingId,
    createdAt: match.createdAt.toISOString(),
  })));
});

router.patch("/admin/matches/:matchId/flag", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminFlagMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = AdminFlagMatchBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [match] = await db.update(matchesTable)
    .set({ isSuspicious: body.data.isSuspicious, suspiciousReason: body.data.reason, status: body.data.isSuspicious ? "flagged" : "completed" })
    .where(eq(matchesTable.id, params.data.matchId))
    .returning();

  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, match.turfId)).limit(1);
  const [teamA] = await db.select().from(teamsTable).where(eq(teamsTable.id, match.teamAId)).limit(1);
  const [teamB] = await db.select().from(teamsTable).where(eq(teamsTable.id, match.teamBId)).limit(1);

  res.json({
    id: match.id,
    turfId: match.turfId,
    turfName: turf?.name ?? "",
    teamAId: match.teamAId,
    teamAName: teamA?.name ?? `Team #${match.teamAId}`,
    teamBId: match.teamBId,
    teamBName: teamB?.name ?? `Team #${match.teamBId}`,
    overs: match.overs,
    matchType: match.matchType,
    matchDate: match.matchDate.toISOString(),
    status: match.status,
    teamAScore: match.teamAScore,
    teamAWickets: match.teamAWickets,
    teamBScore: match.teamBScore,
    teamBWickets: match.teamBWickets,
    winnerTeamId: match.winnerTeamId,
    mvpPlayerId: match.mvpPlayerId,
    mvpPlayerName: null,
    teamACaptainVerified: match.teamACaptainVerified,
    teamBCaptainVerified: match.teamBCaptainVerified,
    isSuspicious: match.isSuspicious,
    bookingId: match.bookingId,
    createdAt: match.createdAt.toISOString(),
  });
});

// ─── Bookings ───────────────────────────────────────────────────────────────

router.get("/admin/bookings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const page = parsed.data.page ?? 1;
  const limit = Math.min(parsed.data.limit ?? 30, 100);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({ booking: bookingsTable, turf: turfsTable, user: usersTable })
    .from(bookingsTable)
    .leftJoin(turfsTable, eq(turfsTable.id, bookingsTable.turfId))
    .leftJoin(usersTable, eq(usersTable.id, bookingsTable.userId))
    .where(parsed.data.status ? eq(bookingsTable.status, parsed.data.status) : undefined)
    .orderBy(desc(bookingsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookingsTable)
    .where(parsed.data.status ? eq(bookingsTable.status, parsed.data.status) : undefined);

  const revenueRows = await db
    .select({ amount: bookingsTable.totalAmount })
    .from(bookingsTable)
    .where(eq(bookingsTable.status, "confirmed"));

  const totalRevenue = revenueRows.reduce((s, b) => s + (b.amount ?? 0), 0);

  res.json({
    bookings: rows.map(({ booking, turf, user }) => ({
      id: booking.id,
      turfId: booking.turfId,
      turfName: turf?.name ?? `Turf #${booking.turfId}`,
      userId: booking.userId,
      userName: user?.name ?? `User #${booking.userId}`,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.totalAmount,
      status: booking.status,
      matchId: booking.matchId,
      createdAt: booking.createdAt.toISOString(),
    })),
    total: Number(totalRow?.count ?? 0),
    totalRevenue,
  });
});

router.patch("/admin/bookings/:bookingId/cancel", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminCancelBookingPathParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(eq(bookingsTable.id, params.data.bookingId))
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, booking.turfId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, booking.userId)).limit(1);

  res.json({
    id: booking.id,
    turfId: booking.turfId,
    turfName: turf?.name ?? `Turf #${booking.turfId}`,
    userId: booking.userId,
    userName: user?.name ?? `User #${booking.userId}`,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalAmount: booking.totalAmount,
    status: booking.status,
    matchId: booking.matchId,
    createdAt: booking.createdAt.toISOString(),
  });
});

// ─── Teams ───────────────────────────────────────────────────────────────────

router.get("/admin/teams", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListTeamsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const page = parsed.data.page ?? 1;
  const limit = Math.min(parsed.data.limit ?? 30, 100);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({ team: teamsTable, captain: usersTable })
    .from(teamsTable)
    .leftJoin(usersTable, eq(usersTable.id, teamsTable.captainId))
    .where(
      parsed.data.search
        ? sql`${teamsTable.name} ILIKE ${"%" + parsed.data.search + "%"}`
        : undefined
    )
    .orderBy(desc(teamsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teamsTable)
    .where(
      parsed.data.search
        ? sql`${teamsTable.name} ILIKE ${"%" + parsed.data.search + "%"}`
        : undefined
    );

  // Get member counts
  const teamIds = rows.map(r => r.team.id);
  const memberCounts = teamIds.length > 0
    ? await db
        .select({ teamId: teamMembersTable.teamId, count: sql<number>`count(*)` })
        .from(teamMembersTable)
        .where(
          and(
            sql`${teamMembersTable.teamId} = ANY(ARRAY[${sql.raw(teamIds.join(","))}]::int[])`,
            eq(teamMembersTable.status, "active")
          )
        )
        .groupBy(teamMembersTable.teamId)
    : [];
  const memberCountMap = new Map(memberCounts.map(m => [m.teamId, Number(m.count)]));

  res.json({
    teams: rows.map(({ team, captain }) => ({
      id: team.id,
      name: team.name,
      captainId: team.captainId,
      captainName: captain?.name ?? "Unknown",
      city: team.city,
      logoUrl: team.logoUrl,
      sport: team.sport,
      memberCount: memberCountMap.get(team.id) ?? 0,
      winCount: team.winCount,
      matchCount: team.matchCount,
      members: [],
      createdAt: team.createdAt.toISOString(),
    })),
    total: Number(totalRow?.count ?? 0),
  });
});

// ─── Feed / Need Players ──────────────────────────────────────────────────────

router.get("/admin/feed", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListFeedQueryParams.safeParse(req.query);
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
        parsed.data.active !== undefined ? eq(needPlayersPostsTable.isActive, parsed.data.active) : undefined,
        parsed.data.city ? ilike(needPlayersPostsTable.city, `%${parsed.data.city}%`) : undefined,
      )
    )
    .orderBy(desc(needPlayersPostsTable.createdAt))
    .limit(100);

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
    matchDate: post.matchDate?.toISOString().split("T")[0] ?? null,
    isActive: post.isActive,
    createdAt: post.createdAt.toISOString(),
  })));
});

router.delete("/admin/feed/:postId", requireAdmin, async (req, res): Promise<void> => {
  const params = AdminDeleteFeedPostPathParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .update(needPlayersPostsTable)
    .set({ isActive: false })
    .where(eq(needPlayersPostsTable.id, params.data.postId))
    .returning();

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
