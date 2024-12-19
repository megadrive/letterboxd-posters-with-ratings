import { PrismaClient } from "@prisma/client";

export let prisma: PrismaClient;

if (!prisma) {
  prisma = new PrismaClient();
}
