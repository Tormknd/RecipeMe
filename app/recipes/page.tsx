import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { ChefHat, Plus } from "lucide-react"
import Link from "next/link"
import { RecipeList } from "@/components/features/RecipeList"
import { LogoutButton } from "@/components/features/LogoutButton"
import { cleanupStuckRecipes } from "@/app/actions/recipes"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function RecipesPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  await cleanupStuckRecipes(user.id)

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="min-h-screen pb-safe px-6 pt-safe">
      <header className="flex items-center justify-between py-6">
        <div>
          <h1 className="text-2xl font-serif font-medium">Mes Recettes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {recipes.length} {recipes.length === 1 ? 'recette' : 'recettes'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LogoutButton />
          <Link 
            href="/recipes/ingest"
            className="p-3 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="bg-muted/50 w-20 h-20 rounded-full flex items-center justify-center">
            <ChefHat className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground/80">Aucune recette</p>
            <p className="text-sm text-muted-foreground">Commencez par ajouter votre première recette</p>
          </div>
          <Link href="/recipes/ingest">
            <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Ajouter une recette
            </button>
          </Link>
        </div>
      ) : (
        <RecipeList recipes={recipes} />
      )}
    </div>
  )
}

