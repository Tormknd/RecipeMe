import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { EditRecipeForm } from "@/components/features/EditRecipeForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { RecipeContent } from "@/lib/recipes/schemas"

export const dynamic = 'force-dynamic'

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { 
      id,
      userId: user.id
    }
  })

  if (!recipe) return notFound()

  let data: RecipeContent
  try {
    data = JSON.parse(recipe.data)
  } catch (e) {
    return <div>Erreur de lecture des données de la recette.</div>
  }

  return (
    <div className="min-h-screen pb-safe px-4 sm:px-6 pt-safe">
      <header className="flex items-center gap-4 py-6">
        <Link href={`/recipes/${id}`} className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors">
          <ArrowLeft className="h-6 w-6 text-foreground/80" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-medium">Modifier la recette</h1>
      </header>

      <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <EditRecipeForm 
          recipeId={recipe.id} 
          initialData={data}
          initialNotes={recipe.notes}
        />
      </div>
    </div>
  )
}

