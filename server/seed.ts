import { db } from './db'; // or './index' if you defined `db` in index.ts
import { users } from '@shared/schema';

async function seed() {
  try {
    await db.insert(users).values({
      username: "admin",
      password: "admin123", // In real apps, hash passwords!
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User"
    });

    const allUsers = await db.select().from(users);
    console.log("✔️ Users table seeded:", allUsers);
  } catch (err) {
    console.error("❌ Seeding error:", err);
  }
}

seed();
