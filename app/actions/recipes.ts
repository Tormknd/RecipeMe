'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { extractRecipeFromInput } from "@/lib/recipes/ai-service"
import { revalidatePath } from "next/cache"
import type { RecipeContent } from "@/lib/recipes/schemas"

export type IngestRecipeResult = {
  success: boolean
  recipeId?: string
  error?: string
}

async function updateRecipeStatus(recipeId: string, userId: string, status: string, statusMessage?: string | null) {
  // Filtrer les messages d'erreur techniques qui ne doivent pas être affichés à l'utilisateur
  let cleanMessage = statusMessage || null
  if (cleanMessage && (
    cleanMessage.includes('revalidatePath') || 
    cleanMessage.includes('Route') ||
    cleanMessage.includes('during render')
  )) {
    cleanMessage = null // Ne pas stocker les erreurs techniques
  }
  
  await prisma.recipe.update({
    where: { 
      id: recipeId,
      userId: userId
    },
    data: {
      status,
      statusMessage: cleanMessage
    }
  })
}

async function processRecipeInBackground(
  recipeId: string,
  userId: string,
  url: string | null,
  files: File[] | null,
  imageBuffers: { buffer: Buffer; mimeType: string }[] | null
) {
  try {
    let recipeContent
    let sourceUrl: string | null = null
    let imageUrl: string | null = null

    if (files && imageBuffers && imageBuffers.length > 0) {
      recipeContent = await extractRecipeFromInput(
        files[0].name || 'image',
        false,
        imageBuffers,
        undefined,
        async (message: string) => {
          await updateRecipeStatus(recipeId, userId, 'processing', message)
        }
      )
    } else if (url) {
      sourceUrl = url
      try {
        recipeContent = await extractRecipeFromInput(url, true, undefined, undefined, async (message: string) => {
          await updateRecipeStatus(recipeId, userId, 'processing', message)
        })
      } catch (extractError: any) {
        console.error(`❌ extractRecipeFromInput failed for ${recipeId}:`, extractError.message)
        throw extractError
      }
    } else {
      throw new Error("Aucune source fournie")
    }

    if (!recipeContent) {
      throw new Error("Le traitement n'a pas retourné de contenu de recette")
    }
    
    await prisma.recipe.update({
      where: { 
        id: recipeId,
        userId: userId
      },
      data: {
        title: recipeContent.title || "Recette sans titre",
        sourceUrl: sourceUrl,
        imageUrl: imageUrl,
        data: JSON.stringify(recipeContent),
        tags: recipeContent.tags?.join(',') || null,
        status: 'completed',
        statusMessage: null
      }
    })
    
    // Note: revalidatePath ne peut pas être appelé ici car cette fonction s'exécute en arrière-plan
    // Le polling côté client (RecipeCardProgress) détectera le changement de statut et rafraîchira automatiquement
  } catch (error) {
    console.error(`❌ Background Processing Error for recipe ${recipeId}:`, error)
    console.error(`❌ Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    
    try {
      let errorMessage = error instanceof Error ? error.message : "Erreur lors du traitement"
      
      // Filtrer les messages d'erreur techniques
      if (errorMessage.includes('revalidatePath') || errorMessage.includes('Route') || errorMessage.includes('during render')) {
        errorMessage = "Erreur lors du traitement"
      }
      
      await prisma.recipe.update({
        where: { 
          id: recipeId,
          userId: userId
        },
        data: {
          status: 'error',
          title: 'Erreur lors du traitement',
          statusMessage: errorMessage.length > 100 ? errorMessage.substring(0, 100) : errorMessage
        }
      })
      console.log(`❌ Recipe ${recipeId} status updated to 'error'`)
    } catch (updateError) {
      console.error("Failed to update error status:", updateError)
    }
  }
}

export async function ingestRecipeAction(formData: FormData): Promise<IngestRecipeResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    await cleanupStuckRecipes(user.id)

    const url = formData.get('url') as string | null
    const files = formData.getAll('files') as File[]

    if (!url && files.length === 0) {
      return { success: false, error: "Veuillez fournir une URL ou au moins une image" }
    }

    let imageBuffers: { buffer: Buffer; mimeType: string }[] | null = null
    
    if (files.length > 0) {
      imageBuffers = []
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const mimeType = file.type || 'image/jpeg'
        imageBuffers.push({ buffer, mimeType })
      }
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: "En cours de création...",
        sourceUrl: url,
        imageUrl: null,
        data: JSON.stringify({ title: "En cours de création...", ingredients: [], instructions: [] }),
        tags: null,
        status: 'processing',
        userId: user.id
      }
    })

    console.log(`🚀 Starting background processing for recipe ${recipe.id}`)
    processRecipeInBackground(recipe.id, user.id, url, files.length > 0 ? Array.from(files) : null, imageBuffers)
      .then(() => {
        console.log(`✅ Background processing completed for recipe ${recipe.id}`)
        // Note: revalidatePath ne peut pas être appelé ici car processRecipeInBackground s'exécute en arrière-plan
        // Le polling côté client (RecipeCardProgress) détectera le changement de statut et rafraîchira automatiquement
      })
      .catch(err => {
        console.error(`❌ Background processing failed for recipe ${recipe.id}:`, err)
      })

    revalidatePath('/recipes')

    return {
      success: true,
      recipeId: recipe.id
    }
  } catch (error) {
    console.error("Ingest Action Error:", error)
    
    let errorMessage = error instanceof Error ? error.message : "Erreur lors de l'importation de la recette"
    
    if (errorMessage.includes('RECITATION') || errorMessage.includes('recitation') || errorMessage.includes('droit d\'auteur')) {
      errorMessage = "Le contenu semble être protégé par le droit d'auteur. Essayez de reformuler manuellement les instructions ou utilisez une autre source."
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

export type DeleteRecipeResult = {
  success: boolean
  error?: string
}

export async function deleteRecipeAction(recipeId: string): Promise<DeleteRecipeResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    await prisma.recipe.delete({
      where: { 
        id: recipeId,
        userId: user.id
      }
    })

    revalidatePath('/recipes')
    return { success: true }
  } catch (error) {
    console.error("Delete Recipe Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la suppression"
    }
  }
}

export type RetryRecipeResult = {
  success: boolean
  error?: string
}

export async function cleanupStuckRecipes(userId: string) {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    
    const stuckRecipes = await prisma.recipe.findMany({
      where: {
        status: 'processing',
        userId: userId,
        createdAt: {
          lt: fiveMinutesAgo
        }
      }
    })

    if (stuckRecipes.length > 0) {
      console.log(`🧹 Cleaning up ${stuckRecipes.length} stuck recipe(s) in processing state`)
      
      await prisma.recipe.deleteMany({
        where: {
          id: {
            in: stuckRecipes.map(r => r.id)
          },
          userId: userId
        }
      })

      return { deleted: stuckRecipes.length }
    }

    return { deleted: 0 }
  } catch (error) {
    console.error("Cleanup Error:", error)
    return { deleted: 0 }
  }
}

export type UpdateRecipeResult = {
  success: boolean
  error?: string
}

export async function updateRecipeAction(
  recipeId: string,
  formData: FormData
): Promise<UpdateRecipeResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const existingRecipe = await prisma.recipe.findUnique({
      where: { 
        id: recipeId,
        userId: user.id
      }
    })
    
    if (!existingRecipe) {
      return { success: false, error: "Recette introuvable" }
    }
    
    let recipeData: RecipeContent = JSON.parse(existingRecipe.data)
    
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const prepTime = formData.get('prepTime') as string | null
    const cookTime = formData.get('cookTime') as string | null
    const servings = formData.get('servings') as string | null
    const notes = formData.get('notes') as string | null
    
    if (title) recipeData.title = title
    if (description !== null) recipeData.description = description || null
    if (prepTime !== null) recipeData.prepTime = prepTime || null
    if (cookTime !== null) recipeData.cookTime = cookTime || null
    if (servings !== null) recipeData.servings = servings || null
    
    const ingredientsText = formData.get('ingredients') as string | null
    if (ingredientsText !== null) {
      const lines = ingredientsText.split('\n').filter(l => l.trim())
      recipeData.ingredients = lines.map(line => {
        const parts = line.split('|').map(p => p.trim())
        return {
          name: parts[0] || '',
          quantity: parts[1] || null,
          unit: parts[2] || null
        }
      })
    }
    
    const instructionsText = formData.get('instructions') as string | null
    if (instructionsText !== null) {
      recipeData.instructions = instructionsText.split('\n').filter(l => l.trim())
    }
    
    const tagsText = formData.get('tags') as string | null
    if (tagsText !== null) {
      recipeData.tags = tagsText.split(',').map(t => t.trim()).filter(t => t)
    }
    
    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        title: recipeData.title,
        data: JSON.stringify(recipeData),
        tags: recipeData.tags?.join(',') || null,
        notes: notes !== null ? notes : existingRecipe.notes
      }
    })
    
    revalidatePath(`/recipes/${recipeId}`)
    revalidatePath('/recipes')
    return { success: true }
    
  } catch (error) {
    console.error("Update Recipe Error:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour" 
    }
  }
}

export type UpdateNotesResult = {
  success: boolean
  error?: string
}

export async function updateRecipeNotesAction(
  recipeId: string,
  notes: string
): Promise<UpdateNotesResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const existingRecipe = await prisma.recipe.findUnique({
      where: { 
        id: recipeId,
        userId: user.id
      }
    })
    
    if (!existingRecipe) {
      return { success: false, error: "Recette introuvable" }
    }

    await prisma.recipe.update({
      where: { 
        id: recipeId,
        userId: user.id
      },
      data: {
        notes: notes || null
      }
    })
    
    revalidatePath(`/recipes/${recipeId}`)
    revalidatePath('/recipes')
    return { success: true }
    
  } catch (error) {
    console.error("Update Notes Error:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Erreur lors de la mise à jour des notes" 
    }
  }
}

export async function retryRecipeAction(recipeId: string): Promise<RetryRecipeResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const recipe = await prisma.recipe.findUnique({
      where: { 
        id: recipeId,
        userId: user.id
      }
    })

    if (!recipe) {
      return { success: false, error: "Recette introuvable" }
    }

    if (recipe.status !== 'error') {
      return { success: false, error: "Cette recette n'est pas en erreur" }
    }

    if (!recipe.sourceUrl) {
      return { success: false, error: "Aucune URL source disponible pour réessayer" }
    }

    await prisma.recipe.update({
      where: { 
        id: recipeId,
        userId: user.id
      },
      data: {
        status: 'processing',
        title: "En cours de création...",
        data: JSON.stringify({ title: "En cours de création...", ingredients: [], instructions: [] })
      }
    })

    processRecipeInBackground(recipeId, user.id, recipe.sourceUrl, null, null)
      .catch(err => console.error("Background processing failed on retry:", err))

    revalidatePath('/recipes')
    return { success: true }
  } catch (error) {
    console.error("Retry Recipe Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la nouvelle tentative"
    }
  }
}

export type CreateRecipeResult = {
  success: boolean
  recipeId?: string
  error?: string
}

export async function createRecipeAction(formData: FormData): Promise<CreateRecipeResult> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const title = formData.get('title') as string
    if (!title || !title.trim()) {
      return { success: false, error: "Le titre est requis" }
    }

    const description = formData.get('description') as string | null
    const prepTime = formData.get('prepTime') as string | null
    const cookTime = formData.get('cookTime') as string | null
    const servings = formData.get('servings') as string | null
    
    const ingredientsText = formData.get('ingredients') as string | null
    const ingredients = ingredientsText 
      ? ingredientsText.split('\n')
          .filter(l => l.trim())
          .map(line => {
            const parts = line.split('|').map(p => p.trim())
            return {
              name: parts[0] || '',
              quantity: parts[1] || null,
              unit: parts[2] || null
            }
          })
      : []

    const instructionsText = formData.get('instructions') as string | null
    const instructions = instructionsText 
      ? instructionsText.split('\n').filter(l => l.trim())
      : []

    const tagsText = formData.get('tags') as string | null
    const tags = tagsText 
      ? tagsText.split(',').map(t => t.trim()).filter(t => t)
      : []

    const recipeData: RecipeContent = {
      title: title.trim(),
      description: description?.trim() || null,
      ingredients,
      instructions,
      prepTime: prepTime?.trim() || null,
      cookTime: cookTime?.trim() || null,
      servings: servings?.trim() || null,
      tags,
      difficulty: null
    }    const recipe = await prisma.recipe.create({
      data: {
        title: recipeData.title,
        sourceUrl: null,
        imageUrl: null,
        data: JSON.stringify(recipeData),
        tags: recipeData.tags?.join(',') || null,
      status: 'completed',
      userId: user.id
    }
  });
  revalidatePath('/recipes')
  return {
      success: true,
      recipeId: recipe.id
    }
  } catch (error) {
    console.error("Create Recipe Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors de la création de la recette"
    }
  }
}