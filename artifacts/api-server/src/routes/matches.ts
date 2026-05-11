import { Router, type IRouter } from "express";
import { db, matchesTable, teamsTable, turfsTable, usersTable, playerStatsTable, matchParticipationsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticate } from "../lib/auth";
import {
  ListMatchesQueryParams,
  CreateMatchBody,
  GetMatchParams,
  UpdateMatchScoreParams,
  UpdateMatchScoreBody,
  VerifyMatchParams,
  VerifyMatchBody,
  ConfirmMatchParticipationParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildMatchResponse(matchId: number) {
  const [row] = await db
    .select({
      match: matchesTable,
      turf: turfsTable,
      teamA: teamsTable,
      mvp: usersTable,
    })
    .from(matchesTable)
    .leftJoin(turfsTable, eq(turfsTable.id, matchesTable.turfId))
    .leftJoin(teamsTable, eq(teamsTable.id, matchesTable.teamAId))
    .leftJoin(usersTable, eq(usersTable.id, matchesTable.mvpPlayerId))
    .where(eq(matchesTable.id, matchId))
    .limit(1);

  if (!row) return null;

  const [teamBRow] = await db.select().from(teamsTable).where(eq(teamsTable.id, row.match.teamBId)).limit(1);

  return {
    id: row.match.id,
    turfId: row.match.turfId,
    turfName: row.turf?.name ?? "",
    teamAId: row.match.teamAId,
    teamAName: row.teamA?.name ?? "",
    teamBId: row.match.teamBId,
    teamBName: teamBRow?.name ?? "",
    overs: row.match.overs,
    matchType: row.match.matchType,
    matchDate: row.match.matchDate.toISOString(),
    status: row.match.status,
    teamAScore: row.match.teamAScore,
    teamAWickets: row.match.teamAWickets,
    teamBScore: row.match.teamBScore,
    teamBWickets: row.match.teamBWickets,
    winnerTeamId: row.match.winnerTeamId,
    mvpPlayerId: row.match.mvpPlayerId,
    mvpPlayerName: row.mvp?.name ?? null,
    teamACaptainVerified: row.match.teamACaptainVerified,
    teamBCaptainVerified: row.match.teamBCaptainVerified,
    isSuspicious: row.match.isSuspicious,
    bookingId: row.match.bookingId,
    createdAt: row.match.createdAt.toISOString(),
  };
}

function detectSuspicious(teamAScore: number | null, teamBScore: number | null, overs: number): boolean {
  if (!teamAScore || !teamBScore) return false;
  const maxReasonableScore = overs * 36;
  return teamAScore > maxReasonableScore || teamBScore > maxReasonableScore;
}

router.get("/matches", async (req, res): Promise<void> => {
  const parsed = ListMatchesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select({
      match: matchesTable,
      turf: turfsTable,
      teamA: teamsTable,
    })
    .from(matchesTable)
    .leftJoin(turfsTable, eq(turfsTable.id, matchesTable.turfId))
    .leftJoin(teamsTable, eq(teamsTable.id, matchesTable.teamAId))
    .where(
      and(
        parsed.data.status ? eq(matchesTable.status, parsed.data.status) : undefined,
        parsed.data.teamId ? sql`(${matchesTable.teamAId} = ${parsed.data.teamId} OR ${matchesTable.teamBId} = ${parsed.data.teamId})` : undefined,
      )
    )
    .orderBy(desc(matchesTable.matchDate))
    .limit(50);

  const teamBIds = [...new Set(rows.map(r => r.match.teamBId))];
  const teamBRows = teamBIds.length > 0
    ? await db.select().from(teamsTable).where(sql`${teamsTable.id} = ANY(${teamBIds})`)
    : [];
  const teamBMap = new Map(teamBRows.map(t => [t.id, t]));

  const mvpIds = rows.map(r => r.match.mvpPlayerId).filter(Boolean) as number[];
  const mvpRows = mvpIds.length > 0
    ? await db.select().from(usersTable).where(sql`${usersTable.id} = ANY(${mvpIds})`)
    : [];
  const mvpMap = new Map(mvpRows.map(u => [u.id, u]));

  res.json(rows.map(({ match, turf, teamA }) => ({
    id: match.id,
    turfId: match.turfId,
    turfName: turf?.name ?? "",
    teamAId: match.teamAId,
    teamAName: teamA?.name ?? "",
    teamBId: match.teamBId,
    teamBName: teamBMap.get(match.teamBId)?.name ?? "",
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
    mvpPlayerName: match.mvpPlayerId ? (mvpMap.get(match.mvpPlayerId)?.name ?? null) : null,
    teamACaptainVerified: match.teamACaptainVerified,
    teamBCaptainVerified: match.teamBCaptainVerified,
    isSuspicious: match.isSuspicious,
    bookingId: match.bookingId,
    createdAt: match.createdAt.toISOString(),
  })));
});

router.post("/matches", authenticate, async (req, res): Promise<void> => {
  const parsed = CreateMatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [match] = await db.insert(matchesTable).values({
    turfId: parsed.data.turfId,
    teamAId: parsed.data.teamAId,
    teamBId: parsed.data.teamBId,
    overs: parsed.data.overs,
    matchType: parsed.data.matchType ?? "friendly",
    matchDate: new Date(parsed.data.matchDate),
    bookingId: parsed.data.bookingId,
    status: "scheduled",
  }).returning();

  const result = await buildMatchResponse(match.id);
  res.status(201).json(result);
});

router.get("/matches/:matchId", async (req, res): Promise<void> => {
  const params = GetMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await buildMatchResponse(params.data.matchId);
  if (!result) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(result);
});

router.patch("/matches/:matchId/score", authenticate, async (req, res): Promise<void> => {
  const params = UpdateMatchScoreParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateMatchScoreBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { matchId } = params.data;
  const { teamAScore, teamBScore, teamAWickets, teamBWickets, winnerTeamId, mvpPlayerId, status } = body.data;

  const isSuspicious = detectSuspicious(teamAScore ?? null, teamBScore ?? null, 10);

  await db.update(matchesTable).set({
    ...(teamAScore !== undefined ? { teamAScore } : {}),
    ...(teamAWickets !== undefined ? { teamAWickets } : {}),
    ...(teamBScore !== undefined ? { teamBScore } : {}),
    ...(teamBWickets !== undefined ? { teamBWickets } : {}),
    ...(winnerTeamId !== undefined ? { winnerTeamId } : {}),
    ...(mvpPlayerId !== undefined ? { mvpPlayerId } : {}),
    ...(status ? { status } : {}),
    isSuspicious,
  }).where(eq(matchesTable.id, matchId));

  const result = await buildMatchResponse(matchId);
  res.json(result);
});

router.post("/matches/:matchId/verify", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = VerifyMatchParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = VerifyMatchBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { matchId } = params.data;

  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).limit(1);
  if (!match) {
    res.status(404).json({ error: "Match not found" });
    return;
  }

  // Determine if user is captain of team A or B
  const [teamA] = await db.select().from(teamsTable).where(eq(teamsTable.id, match.teamAId)).limit(1);
  const [teamB] = await db.select().from(teamsTable).where(eq(teamsTable.id, match.teamBId)).limit(1);

  const isTeamACaptain = teamA?.captainId === user.id;
  const isTeamBCaptain = teamB?.captainId === user.id;

  if (!isTeamACaptain && !isTeamBCaptain) {
    res.status(403).json({ error: "Only team captains can verify matches" });
    return;
  }

  const update: Record<string, any> = {};
  if (isTeamACaptain) update.teamACaptainVerified = body.data.verified;
  if (isTeamBCaptain) update.teamBCaptainVerified = body.data.verified;

  await db.update(matchesTable).set(update).where(eq(matchesTable.id, matchId));

  const [updatedMatch] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId)).limit(1);

  // If both captains verified, mark as verified and update player stats
  if (updatedMatch?.teamACaptainVerified && updatedMatch?.teamBCaptainVerified) {
    await db.update(matchesTable).set({ status: "verified" }).where(eq(matchesTable.id, matchId));

    // Update winner team stats
    if (updatedMatch.winnerTeamId) {
      await db.update(teamsTable).set({ winCount: sql`${teamsTable.winCount} + 1`, matchCount: sql`${teamsTable.matchCount} + 1` }).where(eq(teamsTable.id, updatedMatch.winnerTeamId));
      const loserId = updatedMatch.winnerTeamId === updatedMatch.teamAId ? updatedMatch.teamBId : updatedMatch.teamAId;
      await db.update(teamsTable).set({ matchCount: sql`${teamsTable.matchCount} + 1` }).where(eq(teamsTable.id, loserId));
    }

    // Update MVP stats
    if (updatedMatch.mvpPlayerId) {
      await db.update(playerStatsTable)
        .set({ mvpCount: sql`${playerStatsTable.mvpCount} + 1`, verifiedMatchCount: sql`${playerStatsTable.verifiedMatchCount} + 1` })
        .where(eq(playerStatsTable.userId, updatedMatch.mvpPlayerId));
    }
  }

  const result = await buildMatchResponse(matchId);
  res.json(result);
});

router.post("/matches/:matchId/confirm-participation", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = ConfirmMatchParticipationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { matchId } = params.data;

  await db.update(matchParticipationsTable)
    .set({ confirmed: true })
    .where(and(eq(matchParticipationsTable.matchId, matchId), eq(matchParticipationsTable.userId, user.id)));

  await db.update(playerStatsTable)
    .set({ totalMatches: sql`${playerStatsTable.totalMatches} + 1` })
    .where(eq(playerStatsTable.userId, user.id));

  const result = await buildMatchResponse(matchId);
  if (!result) {
    res.status(404).json({ error: "Match not found" });
    return;
  }
  res.json(result);
});

export default router;
