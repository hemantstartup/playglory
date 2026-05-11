import { Router, type IRouter } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, bookingsTable, turfsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router: IRouter = Router();

const razorpay = new Razorpay({
  key_id: process.env["RAZORPAY_KEY_ID"] ?? "",
  key_secret: process.env["RAZORPAY_KEY_SECRET"] ?? "",
});

// POST /api/payments/razorpay-order
// Creates a Razorpay order for a turf slot booking
router.post("/payments/razorpay-order", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { turfId, date, startTime, endTime } = req.body;

  if (!turfId || !date || !startTime || !endTime) {
    res.status(400).json({ error: "turfId, date, startTime, endTime are required" });
    return;
  }

  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, Number(turfId))).limit(1);
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  // Check slot availability
  const [conflict] = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.turfId, Number(turfId)),
      eq(bookingsTable.date, date),
      eq(bookingsTable.startTime, startTime),
      eq(bookingsTable.status, "confirmed"),
    )
  ).limit(1);

  if (conflict) {
    res.status(400).json({ error: "Slot already booked" });
    return;
  }

  const hours = 1;
  const totalAmount = turf.pricePerHour * hours;
  // Razorpay expects amount in paise (1 INR = 100 paise)
  const amountInPaise = Math.round(totalAmount * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `booking_${user.id}_${Date.now()}`,
    notes: {
      turfId: String(turfId),
      userId: String(user.id),
      date,
      startTime,
      endTime,
    },
  });

  res.status(201).json({
    orderId: order.id,
    amount: amountInPaise,
    currency: "INR",
    keyId: process.env["RAZORPAY_KEY_ID"] ?? "",
    turfName: turf.name,
    description: `${turf.name} · ${date} · ${startTime}–${endTime}`,
  });
});

// POST /api/payments/razorpay-verify
// Verifies the Razorpay payment signature and creates the booking
router.post("/payments/razorpay-verify", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, turfId, date, startTime, endTime } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !turfId || !date || !startTime || !endTime) {
    res.status(400).json({ error: "Missing required payment verification fields" });
    return;
  }

  // Verify signature
  const keySecret = process.env["RAZORPAY_KEY_SECRET"] ?? "";
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    res.status(400).json({ error: "Payment verification failed — invalid signature" });
    return;
  }

  // Check slot still available
  const [conflict] = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.turfId, Number(turfId)),
      eq(bookingsTable.date, date),
      eq(bookingsTable.startTime, startTime),
      eq(bookingsTable.status, "confirmed"),
    )
  ).limit(1);

  if (conflict) {
    res.status(400).json({ error: "Slot was taken while processing payment — please contact support for refund" });
    return;
  }

  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, Number(turfId))).limit(1);
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  const hours = 1;
  const totalAmount = turf.pricePerHour * hours;

  const [booking] = await (db as any).insert(bookingsTable).values({
    turfId: Number(turfId),
    userId: user.id,
    date,
    startTime,
    endTime,
    totalAmount,
    status: "confirmed",
    razorpayOrderId,
    razorpayPaymentId,
    paymentStatus: "paid",
  }).returning();

  res.status(201).json({
    id: booking.id,
    turfId: booking.turfId,
    turfName: turf.name,
    userId: booking.userId,
    userName: user.name,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalAmount: booking.totalAmount,
    status: booking.status,
    matchId: booking.matchId ?? null,
    razorpayOrderId: booking.razorpayOrderId ?? null,
    razorpayPaymentId: booking.razorpayPaymentId ?? null,
    paymentStatus: booking.paymentStatus ?? "paid",
    createdAt: booking.createdAt.toISOString(),
  });
});

export default router;
