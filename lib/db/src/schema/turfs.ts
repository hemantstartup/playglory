import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const turfsTable = pgTable("turfs", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  sports: text("sports").array().notNull().default(["cricket"]),
  pricePerHour: real("price_per_hour").notNull().default(0),
  openTime: text("open_time").notNull().default("06:00"),
  closeTime: text("close_time").notNull().default("22:00"),
  photos: text("photos").array().notNull().default([]),
  verificationStatus: text("verification_status").notNull().default("pending"),
  verificationNotes: text("verification_notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTurfSchema = createInsertSchema(turfsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTurf = z.infer<typeof insertTurfSchema>;
export type Turf = typeof turfsTable.$inferSelect;
