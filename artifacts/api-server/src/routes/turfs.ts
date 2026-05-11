import { Router, type IRouter } from "express";
import { db, usersTable, turfsTable, bookingsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { authenticate } from "../lib/auth";
import {
  ListTurfsQueryParams,
  CreateTurfBody,
  GetTurfParams,
  FetchTurfSlotAvailabilityParams,
  GetTurfDashboardParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function buildTurfResponse(turf: any, owner: any) {
  return {
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
  };
}

router.get("/turfs", async (req, res): Promise<void> => {
  const parsed = ListTurfsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const rows = await db
    .select({ turf: turfsTable, owner: usersTable })
    .from(turfsTable)
    .leftJoin(usersTable, eq(usersTable.id, turfsTable.ownerId))
    .where(
      and(
        eq(turfsTable.isActive, true),
        parsed.data.city ? eq(turfsTable.city, parsed.data.city) : undefined,
        parsed.data.verified ? eq(turfsTable.verificationStatus, "verified") : undefined,
      )
    )
    .orderBy(desc(turfsTable.createdAt))
    .limit(50);

  res.json(rows.map(({ turf, owner }) => buildTurfResponse(turf, owner)));
});

router.post("/turfs", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateTurfBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [turf] = await db.insert(turfsTable).values({
    ownerId: user.id,
    name: parsed.data.name,
    city: parsed.data.city,
    address: parsed.data.address,
    sports: parsed.data.sports ?? ["cricket"],
    pricePerHour: parsed.data.pricePerHour,
    openTime: parsed.data.openTime ?? "06:00",
    closeTime: parsed.data.closeTime ?? "22:00",
    photos: parsed.data.photos ?? [],
    verificationStatus: "pending",
  }).returning();

  res.status(201).json(buildTurfResponse(turf, user));
});

router.get("/turfs/my", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const rows = await db
    .select({ turf: turfsTable })
    .from(turfsTable)
    .where(eq(turfsTable.ownerId, user.id))
    .orderBy(desc(turfsTable.createdAt));

  res.json(rows.map(({ turf }) => buildTurfResponse(turf, user)));
});

router.get("/turfs/:turfId/slots/:date", async (req, res): Promise<void> => {
  const params = FetchTurfSlotAvailabilityParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { turfId, date } = params.data;

  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, turfId)).limit(1);
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  const existingBookings = await db.select().from(bookingsTable).where(
    and(eq(bookingsTable.turfId, turfId), eq(bookingsTable.date, date), eq(bookingsTable.status, "confirmed"))
  );

  const bookedSlots = new Set(existingBookings.map(b => `${b.startTime}-${b.endTime}`));

  const slots = [];
  const openHour = parseInt(turf.openTime.split(":")[0]);
  const closeHour = parseInt(turf.closeTime.split(":")[0]);

  for (let h = openHour; h < closeHour; h++) {
    const start = `${String(h).padStart(2, "0")}:00`;
    const end = `${String(h + 1).padStart(2, "0")}:00`;
    slots.push({
      startTime: start,
      endTime: end,
      isAvailable: !bookedSlots.has(`${start}-${end}`),
      price: turf.pricePerHour,
    });
  }

  res.json(slots);
});

router.get("/turfs/:turfId/dashboard", authenticate, async (req, res): Promise<void> => {
  const params = GetTurfDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { turfId } = params.data;
  const today = new Date().toISOString().split("T")[0];

  const [todayCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.turfId, turfId), eq(bookingsTable.date, today!)));

  const allBookings = await db.select().from(bookingsTable).where(eq(bookingsTable.turfId, turfId));
  const monthlyEarnings = allBookings.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);

  const upcoming = await db
    .select({ booking: bookingsTable, user: usersTable })
    .from(bookingsTable)
    .leftJoin(usersTable, eq(usersTable.id, bookingsTable.userId))
    .where(and(eq(bookingsTable.turfId, turfId), eq(bookingsTable.status, "confirmed"), sql`${bookingsTable.date} >= ${today}`))
    .orderBy(bookingsTable.date)
    .limit(5);

  res.json({
    turfId,
    todayBookings: Number(todayCount?.count ?? 0),
    monthlyEarnings,
    totalBookings: allBookings.length,
    popularSlots: ["06:00-07:00", "17:00-18:00", "18:00-19:00", "19:00-20:00"],
    upcomingBookings: upcoming.map(({ booking, user }) => ({
      id: booking.id,
      turfId: booking.turfId,
      turfName: "",
      userId: booking.userId,
      userName: user?.name ?? "Unknown",
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalAmount: booking.totalAmount,
      status: booking.status,
      matchId: booking.matchId,
      createdAt: booking.createdAt.toISOString(),
    })),
  });
});

router.get("/turfs/:turfId", async (req, res): Promise<void> => {
  const params = GetTurfParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ turf: turfsTable, owner: usersTable })
    .from(turfsTable)
    .leftJoin(usersTable, eq(usersTable.id, turfsTable.ownerId))
    .where(eq(turfsTable.id, params.data.turfId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  res.json(buildTurfResponse(row.turf, row.owner));
});

export default router;
