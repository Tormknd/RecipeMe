import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Users, ArrowLeft, ChefHat, Loader2, AlertCircle, Edit, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CookModeToggle } from "@/components/features/CookModeToggle"
import { DeleteRecipeButton } from "@/components/features/DeleteRecipeButton"
import { RecipeNotes } from "@/components/features/RecipeNotes"
import { RecipeProgress } from "@/components/features/RecipeProgress"
import type { RecipeContent } from "@/lib/recipes/schemas"

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (recipe.status === 'processing') {
    return (
      <div className="min-h-screen pb-safe px-6 pt-safe">
        <header className="flex items-center gap-4 py-6">
          <Link href="/recipes" className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-6 w-6 text-foreground/80" />
          </Link>
          <h1 className="text-xl font-medium">Recette en cours de création</h1>
        </header>

        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RecipeProgress recipeId={recipe.id} initialMessage={recipe.statusMessage} />
          
          <div className="text-center">
            <Link href="/recipes" className="text-sm text-primary hover:underline">
              ← Retour à la liste
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (recipe.status === 'error') {
    return (
      <div className="min-h-screen pb-safe px-6 pt-safe flex flex-col items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-medium">Erreur lors du traitement</h1>
          <p className="text-muted-foreground">
            Une erreur s'est produite lors de l'analyse de la recette. Vous pouvez réessayer depuis la page d'ajout.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Link href="/recipes" className="text-primary hover:underline">
              ← Retour à la liste
            </Link>
            <Link href="/recipes/ingest" className="text-primary hover:underline">
              Réessayer
            </Link>
          </div>
        </div>
      </div>
    )
  }

  let data: RecipeContent
  try {
    data = JSON.parse(recipe.data)
  } catch (e) {
    return <div>Erreur de lecture des données de la recette.</div>
  }

  return (
    <div className="min-h-screen pb-safe px-6 pt-safe">
      <header className="flex flex-col gap-4 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/recipes" className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="h-6 w-6 text-foreground/80" />
          </Link>
          <div className="flex items-center gap-2">
            {recipe.sourceUrl && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                asChild
                title={`Source: ${recipe.sourceUrl}`}
              >
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Ouvrir la source</span>
                </a>
              </Button>
            )}
            <Link href={`/recipes/${recipe.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            </Link>
            <CookModeToggle />
            <DeleteRecipeButton recipeId={recipe.id} recipeTitle={data.title} />
          </div>
        </div>
        <h1 className="text-xl font-medium truncate">{data.title}</h1>
        {data.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{data.description}</p>
        )}
      </header>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex gap-4 text-sm text-muted-foreground">
          {data.prepTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{data.prepTime}</span>
            </div>
          )}
          {data.servings && (
             <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>{data.servings} pers.</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {data.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="font-normal">
              {tag}
            </Badge>
          ))}
        </div>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              Ingrédients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between items-center border-b border-border/30 last:border-0 pb-2 last:pb-0">
                  <span className="font-medium text-foreground/90">{ing.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-medium px-1">Préparation</h2>
          <div className="space-y-4">
            {data.instructions.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-none w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-foreground/80 leading-relaxed text-sm">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        <RecipeNotes recipeId={recipe.id} initialNotes={recipe.notes} />

      </div>
    </div>
  )
}

