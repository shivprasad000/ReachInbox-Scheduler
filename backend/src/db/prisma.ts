import { PrismaClient } from "@prisma/client";

// Single shared instance so both the API process and the worker process
// each keep one pooled connection rather than leaking clients.
export const prisma = new PrismaClient();
