import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

const prismaClientOptions = {
  log: ['query', 'error', 'warn'] as const,
}

const getPrismaClient = () => {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient(prismaClientOptions)
  }

  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./dev.db'
  }
  
  return new PrismaClient(prismaClientOptions)
}

export const prisma = globalForPrisma.prisma || getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

