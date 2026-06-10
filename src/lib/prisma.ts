import { dbClient } from './db-client'
import type { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof dbClient.getClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? dbClient.getClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

