import { prisma } from "@/lib/prisma"

// Limites configurables
const GLOBAL_DAILY_LIMIT = 100
const USER_DAILY_LIMIT = 10

export type RateLimitResult = {
  success: boolean
  error?: string
  remaining?: number
}

export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // 1. Vérifier la limite utilisateur
  const userUsageCount = await prisma.aiUsage.count({
    where: {
      userId: userId,
      createdAt: {
        gte: startOfDay
      }
    }
  })

  if (userUsageCount >= USER_DAILY_LIMIT) {
    return { 
      success: false, 
      error: `Vous avez atteint votre limite quotidienne de ${USER_DAILY_LIMIT} générations.` 
    }
  }

  // 2. Vérifier la limite globale
  const globalUsageCount = await prisma.aiUsage.count({
    where: {
      createdAt: {
        gte: startOfDay
      }
    }
  })

  if (globalUsageCount >= GLOBAL_DAILY_LIMIT) {
    return { 
      success: false, 
      error: "La limite globale du service a été atteinte pour aujourd'hui. Réessayez demain." 
    }
  }

  return { 
    success: true, 
    remaining: USER_DAILY_LIMIT - userUsageCount 
  }
}

export async function trackAiUsage(userId: string) {
  await prisma.aiUsage.create({
    data: {
      userId,
      action: 'recipe_generation'
    }
  })
}
