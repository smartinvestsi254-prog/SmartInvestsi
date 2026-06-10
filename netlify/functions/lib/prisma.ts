import { dbClient } from '../../../src/lib/db-client'
import type { PrismaClient } from '@prisma/client'

declare global {
  var prisma: ReturnType<typeof dbClient.getClient> | undefined
}

const client = globalThis.prisma ?? dbClient.getClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client
}

export default client

