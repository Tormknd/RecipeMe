import { cookies } from 'next/headers'
import { prisma } from './prisma'

const SESSION_COOKIE_NAME = 'recipeme_session'
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 jours

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      cookieStore.delete(SESSION_COOKIE_NAME)
      return null
    }

    return user
  } catch (error) {
    try {
      const cookieStore = await cookies()
      cookieStore.delete(SESSION_COOKIE_NAME)
    } catch {
      // Ignore if cookies() fails
    }
    return null
  }
}

export async function createSession(userId: string) {
  const cookieStore = await cookies()
  const expires = new Date(Date.now() + SESSION_DURATION)

  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expires,
    path: '/',
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

