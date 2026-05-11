import { Router, type IRouter } from "express";
import { db, bookingsTable, turfsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { authenticate } from "../lib/auth";
import {
  ListBookingsQueryParams,
  CreateBookingBody,
  GetBookingParams,
  CancelBookingParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function buildBookingResponse(booking: any, turfName: string, userName: string) {
  return {
    id: booking.id,
    turfId: booking.turfId,
    turfName,
    userId: booking.userId,
    userName,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalAmount: booking.totalAmount,
    status: booking.status,
    matchId: booking.matchId,
    createdAt: booking.createdAt.toISOString(),
  };
}

router.get("/bookings", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const isOwner = user.role === "turf_owner";
  let whereClause;

  if (isOwner) {
    const myTurfs = await db.select({ id: turfsTable.id }).from(turfsTable).where(eq(turfsTable.ownerId, user.id));
    const turfIds = myTurfs.map(t => t.id);
    if (turfIds.length === 0) {
      res.json([]);
      return;
    }
    whereClause = and(
      sql`${bookingsTable.turfId} = ANY(${turfIds})`,
      parsed.data.status ? eq(bookingsTable.status, parsed.data.status) : undefined,
    );
  } else {
    whereClause = and(
      eq(bookingsTable.userId, user.id),
      parsed.data.status ? eq(bookingsTable.status, parsed.data.status) : undefined,
      parsed.data.turfId ? eq(bookingsTable.turfId, parsed.data.turfId) : undefined,
    );
  }

  const rows = await db
    .select({ booking: bookingsTable, turf: turfsTable, bookingUser: usersTable })
    .from(bookingsTable)
    .leftJoin(turfsTable, eq(turfsTable.id, bookingsTable.turfId))
    .leftJoin(usersTable, eq(usersTable.id, bookingsTable.userId))
    .where(whereClause)
    .orderBy(bookingsTable.date)
    .limit(50);

  res.json(rows.map(({ booking, turf, bookingUser }) =>
    buildBookingResponse(booking, turf?.name ?? "", bookingUser?.name ?? "")
  ));
});

router.post("/bookings", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { turfId, date, startTime, endTime } = parsed.data;

  // Check slot availability
  const [conflict] = await db.select().from(bookingsTable).where(
    and(
      eq(bookingsTable.turfId, turfId),
      eq(bookingsTable.date, date),
      eq(bookingsTable.startTime, startTime),
      eq(bookingsTable.status, "confirmed"),
    )
  ).limit(1);

  if (conflict) {
    res.status(400).json({ error: "Slot already booked" });
    return;
  }

  const [turf] = await db.select().from(turfsTable).where(eq(turfsTable.id, turfId)).limit(1);
  if (!turf) {
    res.status(404).json({ error: "Turf not found" });
    return;
  }

  const hours = 1;
  const totalAmount = turf.pricePerHour * hours;

  const [booking] = await db.insert(bookingsTable).values({
    turfId,
    userId: user.id,
    date,
    startTime,
    endTime,
    totalAmount,
    status: "confirmed",
  }).returning();

  res.status(201).json(buildBookingResponse(booking, turf.name, user.name));
});

router.get("/bookings/:bookingId", authenticate, async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ booking: bookingsTable, turf: turfsTable, bookingUser: usersTable })
    .from(bookingsTable)
    .leftJoin(turfsTable, eq(turfsTable.id, bookingsTable.turfId))
    .leftJoin(usersTable, eq(usersTable.id, bookingsTable.userId))
    .where(eq(bookingsTable.id, params.data.bookingId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json(buildBookingResponse(row.booking, row.turf?.name ?? "", row.bookingUser?.name ?? ""));
});

router.delete("/bookings/:bookingId", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = CancelBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({ booking: bookingsTable, turf: turfsTable, bookingUser: usersTable })
    .from(bookingsTable)
    .leftJoin(turfsTable, eq(turfsTable.id, bookingsTable.turfId))
    .leftJoin(usersTable, eq(usersTable.id, bookingsTable.userId))
    .where(and(eq(bookingsTable.id, params.data.bookingId), eq(bookingsTable.userId, user.id)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  const [updated] = await db.update(bookingsTable).set({ status: "cancelled" }).where(eq(bookingsTable.id, params.data.bookingId)).returning();

  res.json(buildBookingResponse(updated, row.turf?.name ?? "", row.bookingUser?.name ?? ""));
});

export default router;
