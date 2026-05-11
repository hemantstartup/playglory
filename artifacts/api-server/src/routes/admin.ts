import { Router, type IRouter } from "express";
import { db, usersTable, matchesTable, turfsTable, bookingsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
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
  const [totalTurfsRow] = await db.select({ count: sql<number>`count(*)` }).from(turfsTable);
  const [pendingTurfsRow] = await db.select({ count: sql<number>`count(*)` }).from(turfsTable).where(eq(turfsTable.verificationStatus, "pending"));

  const bookings = await db.select({ amount: bookingsTable.totalAmount }).from(bookingsTable).where(eq(bookingsTable.status, "confirmed"));
  const revenueEstimate = bookings.reduce((sum, b) => sum + (b.amount ?? 0), 0);

  const recentMatches = await db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)).limit(3);
  const recentUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(3);

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
      description: `New ${u.role} registered: ${u.name}`,
      createdAt: u.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  res.json({
    totalUsers: Number(totalUsersRow?.count ?? 0),
    totalPlayers: Number(totalPlayersRow?.count ?? 0),
    totalTurfOwners: Number(totalTurfOwnersRow?.count ?? 0),
    totalMatches: Number(totalMatchesRow?.count ?? 0),
    verifiedMatches: Number(verifiedMatchesRow?.count ?? 0),
    suspiciousMatches: Number(suspiciousMatchesRow?.count ?? 0),
    totalBookings: Number(totalBookingsRow?.count ?? 0),
    totalTurfs: Number(totalTurfsRow?.count ?? 0),
    pendingTurfs: Number(pendingTurfsRow?.count ?? 0),
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
    .limit(50);

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

  res.json(rows.map(({ match, turf }) => ({
    id: match.id,
    turfId: match.turfId,
    turfName: turf?.name ?? "",
    teamAId: match.teamAId,
    teamAName: String(match.teamAId),
    teamBId: match.teamBId,
    teamBName: String(match.teamBId),
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

  res.json({
    id: match.id,
    turfId: match.turfId,
    turfName: turf?.name ?? "",
    teamAId: match.teamAId,
    teamAName: String(match.teamAId),
    teamBId: match.teamBId,
    teamBName: String(match.teamBId),
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

export default router;
