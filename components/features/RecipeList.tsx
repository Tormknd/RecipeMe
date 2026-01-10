'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { DeleteRecipeCardButton } from "./DeleteRecipeCardButton"
import { RetryRecipeButton } from "./RetryRecipeButton"
import { RecipeCardProgress } from "./RecipeCardProgress"
import type { RecipeContent } from "@/lib/recipes/schemas"
import { Recipe } from "@prisma/client"
import { cn } from "@/lib/utils"

interface RecipeListProps {
  recipes: Recipe[]
}

export function RecipeList({ recipes }: RecipeListProps) {
  const router = useRouter()
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  const handleDeleted = (recipeId: string) => {
    setDeletedIds(prev => new Set(prev).add(recipeId))
  }

  const visibleRecipes = recipes.filter(r => !deletedIds.has(r.id))
  
  const processingRecipes = visibleRecipes.filter(r => r.status === 'processing' || r.status === 'error')
  const hasProcessingRecipes = processingRecipes.length > 0

  useEffect(() => {
    if (!hasProcessingRecipes) return

    const interval = setInterval(() => {
      router.refresh()
    }, 3000) // Polling toutes les 3 secondes au lieu de 10

    return () => clearInterval(interval)
  }, [hasProcessingRecipes, router])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {visibleRecipes.map((recipe) => {
        let data: RecipeContent
        try {
          data = JSON.parse(recipe.data)
        } catch (e) {
          return null
        }

        const isProcessing = recipe.status === 'processing'
        const isError = recipe.status === 'error'

        return (
          <div key={recipe.id} className="relative group">
            <Link href={isProcessing || isError ? '#' : `/recipes/${recipe.id}`}>
              <Card className={cn(
                "border-border/50 bg-card/50 hover:bg-card/80 transition-all hover:shadow-lg h-full",
                deletedIds.has(recipe.id) && "opacity-50 pointer-events-none",
                isProcessing && "opacity-75 cursor-wait",
                isError && "border-destructive/50 bg-destructive/5"
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      {isError && (
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                      )}
                      <h3 className={cn(
                        "font-medium text-foreground/90 font-medium line-clamp-2",
                        isProcessing && "text-muted-foreground"
                      )}>
                        {data.title}
                      </h3>
                    </div>
                    {recipe.imageUrl && !isProcessing && (
                      <img 
                        src={recipe.imageUrl} 
                        alt={data.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                  </div>

                  {isProcessing && (
                    <RecipeCardProgress 
                      recipeId={recipe.id} 
                      initialMessage={recipe.statusMessage}
                    />
                  )}

                  {isError && (
                    <div className="text-xs text-destructive">
                      Erreur lors du traitement.
                    </div>
                  )}

                  {!isProcessing && !isError && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {data.tags && data.tags.length > 0 && data.tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-normal">
                            {tag}
                          </Badge>
                        ))}
                        {data.tags && data.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            +{data.tags.length - 3}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {data.prepTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{data.prepTime}</span>
                          </div>
                        )}
                        {data.servings && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{data.servings}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
            {!isProcessing && (
              <DeleteRecipeCardButton 
                recipeId={recipe.id} 
                recipeTitle={data.title}
                onDeleted={() => handleDeleted(recipe.id)}
              />
            )}
            {isError && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <RetryRecipeButton recipeId={recipe.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

