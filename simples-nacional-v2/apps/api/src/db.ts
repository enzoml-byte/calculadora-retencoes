import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

/** Singleton por DATABASE_URL (testes usam banco proprio via env antes do 1o uso). */
export function getDb(): PrismaClient {
  prisma ??= new PrismaClient();
  return prisma;
}

export async function fecharDb(): Promise<void> {
  await prisma?.$disconnect();
  prisma = null;
}
