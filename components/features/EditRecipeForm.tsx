'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateRecipeAction } from '@/app/actions/recipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, ChefHat, StickyNote, Plus, Trash2, GripVertical } from 'lucide-react'
import type { RecipeContent } from '@/lib/recipes/schemas'

interface EditRecipeFormProps {
  recipeId: string
  initialData: RecipeContent
  initialNotes?: string | null
}

interface Ingredient {
  name: string
  quantity: string
  unit: string
}

export function EditRecipeForm({ recipeId, initialData, initialNotes }: EditRecipeFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [title, setTitle] = useState(initialData.title)
  const [description, setDescription] = useState(initialData.description || '')
  const [prepTime, setPrepTime] = useState(initialData.prepTime || '')
  const [cookTime, setCookTime] = useState(initialData.cookTime || '')
  const [servings, setServings] = useState(initialData.servings || '')
  const [tags, setTags] = useState(initialData.tags.join(', '))
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData.ingredients.map(ing => ({
      name: ing.name || '',
      quantity: ing.quantity || '',
      unit: ing.unit || ''
    }))
  )
  const [instructions, setInstructions] = useState<string[]>(initialData.instructions)
  const [notes, setNotes] = useState(initialNotes || '')

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: '' }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addInstruction = () => {
    setInstructions([...instructions, ''])
  }

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = value
    setInstructions(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('prepTime', prepTime)
    formData.append('cookTime', cookTime)
    formData.append('servings', servings)
    formData.append('tags', tags)
    
    const ingredientsText = ingredients
      .map(ing => `${ing.name}|${ing.quantity}|${ing.unit}`)
      .join('\n')
    formData.append('ingredients', ingredientsText)
    
    formData.append('instructions', instructions.join('\n'))
    formData.append('notes', notes)

    try {
      const result = await updateRecipeAction(recipeId, formData)
      
      if (result.success) {
        router.push(`/recipes/${recipeId}`)
        router.refresh()
      } else {
        setError(result.error || 'Erreur lors de la mise à jour')
        setIsLoading(false)
      }
    } catch (err) {
      setError('Une erreur est survenue')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg text-sm text-destructive bg-destructive/10 border border-destructive/20">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Titre *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isLoading}
          placeholder="Une délicieuse recette..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prepTime">Préparation</Label>
          <Input
            id="prepTime"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            placeholder="15 min"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cookTime">Cuisson</Label>
          <Input
            id="cookTime"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            placeholder="30 min"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="servings">Portions</Label>
          <Input
            id="servings"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            placeholder="4 personnes"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Italien, Dessert, Rapide"
          disabled={isLoading}
        />
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              Ingrédients
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
              disabled={isLoading}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun ingrédient. Cliquez sur "Ajouter" pour en ajouter un.
            </p>
          ) : (
            ingredients.map((ing, index) => (
              <div key={index} className="flex gap-2 items-start p-3 rounded-lg border border-border/30 bg-background/50">
                <div className="flex items-center pt-2 text-muted-foreground">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Nom de l'ingrédient"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    disabled={isLoading}
                    className="sm:col-span-1"
                  />
                  <Input
                    placeholder="Quantité"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                    disabled={isLoading}
                    className="sm:col-span-1"
                  />
                  <div className="flex gap-2 sm:col-span-1">
                    <Input
                      placeholder="Unité (g, ml, etc.)"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      disabled={isLoading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              Instructions
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addInstruction}
              disabled={isLoading}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {instructions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune instruction. Cliquez sur "Ajouter" pour en ajouter une.
            </p>
          ) : (
            instructions.map((instruction, index) => (
              <div key={index} className="flex gap-3 items-start p-3 rounded-lg border border-border/30 bg-background/50">
                <div className="flex-none w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold mt-1">
                  {index + 1}
                </div>
                <Textarea
                  placeholder={`Étape ${index + 1}...`}
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  disabled={isLoading}
                  rows={2}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInstruction(index)}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            Mes Remarques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajoutez vos remarques personnelles, modifications, astuces..."
            rows={6}
            disabled={isLoading}
            className="bg-background"
          />
        </CardContent>
      </Card>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sauvegarde...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder les modifications
          </>
        )}
      </Button>
    </form>
  )
}

