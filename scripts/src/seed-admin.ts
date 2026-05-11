import bcrypt from "bcryptjs";
import { db, usersTable, playerProfilesTable, playerStatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const hash = await bcrypt.hash("admin123", 10);
console.log("Admin bcrypt hash:", hash);

// Update or insert the admin user with proper bcrypt hash
const [existing] = await db.select().from(usersTable).where(eq(usersTable.phone, "9999999999")).limit(1);

if (existing) {
  await db.update(usersTable).set({ passwordHash: hash, role: "admin" }).where(eq(usersTable.phone, "9999999999"));
  console.log("Admin user updated with bcrypt hash");
} else {
  await db.insert(usersTable).values({
    name: "Super Admin",
    phone: "9999999999",
    passwordHash: hash,
    role: "admin",
    city: "Mumbai",
    isVerified: true,
  });
  console.log("Admin user created");
}

// Seed some sample players for testing
const playerPhone = "8888888888";
const [existingPlayer] = await db.select().from(usersTable).where(eq(usersTable.phone, playerPhone)).limit(1);
if (!existingPlayer) {
  const playerHash = await bcrypt.hash("player123", 10);
  const [player] = await db.insert(usersTable).values({
    name: "Rohit Sharma",
    phone: playerPhone,
    passwordHash: playerHash,
    role: "player",
    city: "Mumbai",
    isVerified: true,
  }).returning();
  await db.insert(playerProfilesTable).values({
    userId: player.id,
    playerRole: "batsman",
    battingStyle: "Right Hand",
    availabilityStatus: "available",
    overallRating: 8.5,
    battingRating: 9.0,
    isVerified: true,
    trustScore: 95,
  });
  await db.insert(playerStatsTable).values({
    userId: player.id,
    totalMatches: 47,
    totalRuns: 1823,
    totalWickets: 3,
    highestScore: 112,
    totalWins: 28,
    mvpCount: 12,
    verifiedMatchCount: 40,
  });
  console.log("Sample player created:", player.id);
}

process.exit(0);
