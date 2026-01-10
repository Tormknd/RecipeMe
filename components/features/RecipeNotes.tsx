'use client'

import { useState } from 'react'
import { updateRecipeNotesAction } from '@/app/actions/recipes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { StickyNote, Save, Loader2, Edit } from 'lucide-react'

interface RecipeNotesProps {
  recipeId: string
  initialNotes?: string | null
}

export function RecipeNotes({ recipeId, initialNotes }: RecipeNotesProps) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(!initialNotes)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const result = await updateRecipeNotesAction(recipeId, notes)
      
      if (result.success) {
        setIsEditing(false)
      } else {
        setError(result.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-primary" />
          Mes Remarques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez vos remarques personnelles, modifications, astuces..."
              rows={4}
              disabled={isSaving}
              className="bg-background"
            />
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
                {error}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotes(initialNotes || '')
                  setIsEditing(false)
                }}
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            {notes ? (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
              Aucune remarque pour le moment. Cliquez sur "Modifier" pour en ajouter.
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="w-full"
            >
              <Edit className="mr-2 h-4 w-4" />
              {notes ? 'Modifier les remarques' : 'Ajouter des remarques'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

