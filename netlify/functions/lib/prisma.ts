import dbClient from '../../../../src/lib/db-client'
import type { PrismaClient } from '@prisma/client'

declare global {
  var prisma: ReturnType<typeof dbClient.getCurrentClient> | undefined
}

const client = globalThis.prisma ?? dbClient.getCurrentClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = client
}

export default client

