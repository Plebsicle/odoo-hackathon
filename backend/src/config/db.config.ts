import { PrismaClient } from '@prisma/client';
import "dotenv/config";

let prisma: PrismaClient;
// @ts-ignore
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // @ts-ignore
  if (!global.prisma) {
    // @ts-ignore
    global.prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = global.prisma;
}
async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");

  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
}

testConnection();

export default prisma;

