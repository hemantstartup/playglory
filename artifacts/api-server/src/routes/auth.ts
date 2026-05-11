import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, playerProfilesTable, playerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authenticate } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, phone, email, password, city } = parsed.data;
  const role = (req.body.role as string) ?? "player";
  const allowedRoles = ["player", "turf_owner", "admin"];
  if (!allowedRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing) {
    res.status(400).json({ error: "Phone number already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(usersTable).values({
    name,
    phone,
    email: email ?? null,
    passwordHash,
    role,
    city: city ?? null,
  }).returning();

  if (user.role === "player") {
    await db.insert(playerProfilesTable).values({ userId: user.id });
    await db.insert(playerStatsTable).values({ userId: user.id });
  }

  const token = signToken(user.id);

  res.status(201).json({
    token,
    user: {
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
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { phone, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Account is banned" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: {
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
    },
  });
});

router.get("/auth/me", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
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

export default router;
