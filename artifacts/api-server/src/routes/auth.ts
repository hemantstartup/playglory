import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, playerProfilesTable, playerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authenticate } from "../lib/auth";
import { RegisterBody, LoginBody, SendOtpBody, VerifyOtpBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ─── In-memory OTP store ────────────────────────────────────────────────────
interface OtpRecord {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpiredOtps() {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (record.expiresAt < now) otpStore.delete(phone);
  }
}

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

// ─── Send OTP ────────────────────────────────────────────────────────────────
router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const parsed = SendOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Phone number is required" });
    return;
  }

  const { phone } = parsed.data;

  if (!/^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""))) {
    res.status(400).json({ error: "Enter a valid 10-digit Indian mobile number" });
    return;
  }

  cleanExpiredOtps();

  const otp = generateOtp();
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  // In production, send via SMS provider (e.g. MSG91, Fast2SMS)
  // For now, return devOtp so the app can show it for testing
  const isDev = process.env.NODE_ENV !== "production";

  req.log.info({ phone, otp: isDev ? otp : "***" }, "OTP generated");

  res.json({
    message: "OTP sent successfully",
    devOtp: isDev ? otp : null,
  });
});

// ─── Verify OTP ──────────────────────────────────────────────────────────────
router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Phone and OTP are required" });
    return;
  }

  const { phone, otp, name, role, city } = parsed.data;

  const record = otpStore.get(phone);

  if (!record) {
    res.status(401).json({ error: "OTP not found or expired. Please request a new one." });
    return;
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(phone);
    res.status(401).json({ error: "OTP has expired. Please request a new one." });
    return;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(phone);
    res.status(429).json({ error: "Too many attempts. Please request a new OTP." });
    return;
  }

  if (record.otp !== otp) {
    record.attempts += 1;
    res.status(401).json({ error: `Incorrect OTP. ${MAX_ATTEMPTS - record.attempts} attempt(s) remaining.` });
    return;
  }

  // OTP valid — clear it
  otpStore.delete(phone);

  // Check if user exists
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);

  if (existing) {
    // Existing user — log them in
    if (existing.isBanned) {
      res.status(403).json({ error: "Account is banned" });
      return;
    }
    const token = signToken(existing.id, existing.role);
    res.json({ newUser: false, token, userId: existing.id });
    return;
  }

  // New user — need name + role to register
  if (!name) {
    res.json({ newUser: true, token: null, userId: null });
    return;
  }

  // Register new user via OTP (no password needed — use a random hash)
  const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
  const userRole = (role === "turf_owner" ? "turf_owner" : "player") as "player" | "turf_owner";

  const [newUser] = await db.insert(usersTable).values({
    name,
    phone,
    email: null,
    passwordHash,
    role: userRole,
    city: city ?? null,
    isVerified: true, // OTP-verified users are automatically verified
  }).returning();

  if (newUser.role === "player") {
    await db.insert(playerProfilesTable).values({ userId: newUser.id });
    await db.insert(playerStatsTable).values({ userId: newUser.id });
  }

  const token = signToken(newUser.id, newUser.role);
  res.json({ newUser: false, token, userId: newUser.id });
});

export default router;
