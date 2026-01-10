import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupOrphanRecipes() {
  try {
    const allUsers = await prisma.user.findMany({
      select: { id: true }
    })
    
    if (allUsers.length === 0) {
      console.log('No users found. All recipes will be deleted.')
      const deleted = await prisma.$executeRaw`DELETE FROM Recipe`
      console.log(`Deleted ${deleted} recipes`)
      return
    }

    const userIds = allUsers.map(u => u.id)
    const placeholders = userIds.map(() => '?').join(',')
    
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM Recipe WHERE userId NOT IN (${placeholders})`,
      ...userIds
    )
    
    console.log(`Deleted ${deleted} orphan recipes`)
  } catch (error) {
    console.error('Error cleaning up orphan recipes:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupOrphanRecipes()

