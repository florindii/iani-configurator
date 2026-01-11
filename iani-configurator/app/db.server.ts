import { PrismaClient } from "@prisma/client";

// Initialize Prisma Client
const db = new PrismaClient();

// Ensure proper cleanup on process exit
process.on('beforeExit', async () => {
  await db.$disconnect();
});

export { db };
export default db;