import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Pasamos un objeto de configuración (aunque esté vacío) para complacer la firma de Prisma 7
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({} as any);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;