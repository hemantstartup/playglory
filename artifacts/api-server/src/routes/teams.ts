import { Router, type IRouter } from "express";
import { db, usersTable, teamsTable, teamMembersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticate } from "../lib/auth";
import {
  ListTeamsQueryParams,
  CreateTeamBody,
  GetTeamParams,
  JoinTeamParams,
  UpdateTeamMemberParams,
  UpdateTeamMemberBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildTeamResponse(teamId: number) {
  const [team] = await db.select({ team: teamsTable, captain: usersTable })
    .from(teamsTable)
    .leftJoin(usersTable, eq(usersTable.id, teamsTable.captainId))
    .where(eq(teamsTable.id, teamId))
    .limit(1);

  if (!team) return null;

  const membersRows = await db
    .select({ member: teamMembersTable, user: usersTable })
    .from(teamMembersTable)
    .leftJoin(usersTable, eq(usersTable.id, teamMembersTable.userId))
    .where(eq(teamMembersTable.teamId, teamId));

  return {
    id: team.team.id,
    name: team.team.name,
    captainId: team.team.captainId,
    captainName: team.captain?.name ?? "Unknown",
    city: team.team.city,
    logoUrl: team.team.logoUrl,
    sport: team.team.sport,
    memberCount: membersRows.filter(m => m.member.status === "active").length,
    winCount: team.team.winCount,
    matchCount: team.team.matchCount,
    createdAt: team.team.createdAt.toISOString(),
    members: membersRows.map(({ member, user }) => ({
      id: member.id,
      userId: member.userId,
      teamId: member.teamId,
      userName: user?.name ?? "Unknown",
      playerRole: null,
      status: member.status,
      joinedAt: member.joinedAt?.toISOString() ?? null,
    })),
  };
}

router.get("/teams", async (req, res): Promise<void> => {
  const parsed = ListTeamsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select({ team: teamsTable, captain: usersTable })
    .from(teamsTable)
    .leftJoin(usersTable, eq(usersTable.id, teamsTable.captainId))
    .where(
      and(
        eq(teamsTable.isActive, true),
        parsed.data.city ? eq(teamsTable.city, parsed.data.city) : undefined,
        parsed.data.search ? sql`${teamsTable.name} ILIKE ${"%" + parsed.data.search + "%"}` : undefined,
      )
    )
    .orderBy(desc(teamsTable.createdAt))
    .limit(50);

  const memberCounts = await db
    .select({ teamId: teamMembersTable.teamId, count: sql<number>`count(*)` })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.status, "active"))
    .groupBy(teamMembersTable.teamId);

  const countsMap = new Map(memberCounts.map(r => [r.teamId, Number(r.count)]));

  res.json(rows.map(({ team, captain }) => ({
    id: team.id,
    name: team.name,
    captainId: team.captainId,
    captainName: captain?.name ?? "Unknown",
    city: team.city,
    logoUrl: team.logoUrl,
    sport: team.sport,
    memberCount: countsMap.get(team.id) ?? 0,
    winCount: team.winCount,
    matchCount: team.matchCount,
    createdAt: team.createdAt.toISOString(),
    members: [],
  })));
});

router.post("/teams", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db.insert(teamsTable).values({
    name: parsed.data.name,
    captainId: user.id,
    city: parsed.data.city,
    sport: parsed.data.sport ?? "cricket",
    logoUrl: parsed.data.logoUrl,
  }).returning();

  await db.insert(teamMembersTable).values({
    teamId: team.id,
    userId: user.id,
    status: "active",
    joinedAt: new Date(),
  });

  const result = await buildTeamResponse(team.id);
  res.status(201).json(result);
});

router.get("/teams/:teamId", async (req, res): Promise<void> => {
  const params = GetTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await buildTeamResponse(params.data.teamId);
  if (!result) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(result);
});

router.post("/teams/:teamId/join", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = JoinTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { teamId } = params.data;

  const [existing] = await db.select().from(teamMembersTable).where(
    and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, user.id))
  ).limit(1);

  if (existing) {
    res.status(400).json({ error: "Already a member or request pending" });
    return;
  }

  await db.insert(teamMembersTable).values({ teamId, userId: user.id, status: "pending" });

  const result = await buildTeamResponse(teamId);
  if (!result) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(result);
});

router.patch("/teams/:teamId/members/:memberId", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = UpdateTeamMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateTeamMemberBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { teamId, memberId } = params.data;

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId)).limit(1);
  if (!team || team.captainId !== user.id) {
    res.status(403).json({ error: "Only the captain can manage members" });
    return;
  }

  await db.update(teamMembersTable)
    .set({
      status: body.data.status,
      joinedAt: body.data.status === "active" ? new Date() : null,
    })
    .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)));

  const result = await buildTeamResponse(teamId);
  if (!result) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  res.json(result);
});

export default router;
