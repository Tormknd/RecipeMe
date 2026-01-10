import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await params
    const recipe = await prisma.recipe.findUnique({
      where: {
        id,
        userId: user.id
      },
      select: {
        status: true,
        statusMessage: true
      }
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      status: recipe.status,
      statusMessage: recipe.statusMessage
    })
  } catch (error) {
    console.error('Error fetching recipe status:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


