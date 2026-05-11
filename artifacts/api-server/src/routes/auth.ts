import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import twilio from "twilio";
import { db, usersTable, playerProfilesTable, playerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authenticate } from "../lib/auth";
import { RegisterBody, LoginBody, SendOtpBody, VerifyOtpBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Twilio Verify client ─────────────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
const VERIFY_SID = process.env.TWILIO_VERIFY_SID!;

// ─── Register ────────────────────────────────────────────────────────────────
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

  const token = signToken(user.id, user.role);

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

// ─── Login ───────────────────────────────────────────────────────────────────
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

  const token = signToken(user.id, user.role);

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

// ─── Me ──────────────────────────────────────────────────────────────────────
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

// ─── Send OTP (via Twilio Verify) ─────────────────────────────────────────────
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const phone = parsed.data.phone.replace(/\s+/g, "");

  if (!/^[6-9]\d{9}$/.test(phone)) {
    res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
    return;
  }

  // Twilio expects E.164 format: +91XXXXXXXXXX
  const e164 = `+91${phone}`;

  try {
    await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verifications.create({ to: e164, channel: "sms" });

    req.log.info({ phone }, "OTP sent via Twilio");

    res.json({
      message: "OTP sent successfully",
      devOtp: null, // real SMS — no dev leak
    });
  } catch (err: any) {
    req.log.error({ err }, "Twilio send-otp error");
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// ─── Verify OTP (via Twilio Verify) ───────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Phone and OTP are required" });
    return;
  }

  const { otp, name, role, city } = parsed.data;
  const phone = parsed.data.phone.replace(/\s+/g, "");
  const e164 = `+91${phone}`;

  try {
    const check = await twilioClient.verify.v2
      .services(VERIFY_SID)
      .verificationChecks.create({ to: e164, code: otp });

    if (check.status !== "approved") {
      res.status(401).json({ error: "Incorrect OTP. Please try again." });
      return;
    }
  } catch (err: any) {
    req.log.error({ err }, "Twilio verify-otp error");
    const msg = err?.message ?? "OTP verification failed.";
    res.status(401).json({ error: msg });
    return;
  }

  // OTP approved — check if user exists
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (existing) {
    if (existing.isBanned) {
      res.status(403).json({ error: "Account is banned" });
      return;
    }
    const token = signToken(existing.id, existing.role);
    res.json({ newUser: false, token, userId: existing.id });
    return;
  }

  // New user — need name + role to finish registration
  if (!name) {
    res.json({ newUser: true, token: null, userId: null });
    return;
  }

  // Register new OTP-verified user (no password required)
  const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
  const userRole = (role === "turf_owner" ? "turf_owner" : "player") as "player" | "turf_owner";

  const [newUser] = await db
    .insert(usersTable)
    .values({
      name,
      phone,
      email: null,
      passwordHash,
      role: userRole,
      city: city ?? null,
      isVerified: true,
    })
    .returning();

  if (newUser.role === "player") {
    await db.insert(playerProfilesTable).values({ userId: newUser.id });
    await db.insert(playerStatsTable).values({ userId: newUser.id });
  }

  const token = signToken(newUser.id, newUser.role);
  res.json({ newUser: false, token, userId: newUser.id });
});

export default router;
