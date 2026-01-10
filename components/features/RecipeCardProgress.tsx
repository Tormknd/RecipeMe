'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'

interface RecipeCardProgressProps {
  recipeId: string
  initialMessage?: string | null
}

const PROGRESS_MESSAGES = [
  'Téléchargement de la vidéo...',
  'Analyse du flux audio...',
  'Extraction des ingrédients avec Gemini...',
  'Structuration de la recette...',
  'Finalisation...'
]

const FALLBACK_MESSAGES = [
  'Récupération du contenu...',
  'Analyse du contenu...',
  'Extraction des informations...',
  'Structuration de la recette...',
  'Finalisation...'
]

export function RecipeCardProgress({ recipeId, initialMessage }: RecipeCardProgressProps) {
  const [progress, setProgress] = useState(10)
  const [currentMessage, setCurrentMessage] = useState(initialMessage || 'Initialisation...')
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const messages = initialMessage?.toLowerCase().includes('vidéo') || 
                    initialMessage?.toLowerCase().includes('audio') 
                    ? PROGRESS_MESSAGES 
                    : FALLBACK_MESSAGES

    let currentMsgIndex = 0
    if (initialMessage) {
      const foundIndex = messages.findIndex(msg => 
        initialMessage.toLowerCase().includes(msg.toLowerCase().split('...')[0])
      )
      if (foundIndex >= 0) {
        currentMsgIndex = foundIndex
        setMessageIndex(foundIndex)
      }
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/recipes/${recipeId}/status`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.status === 'completed' || data.status === 'error') {
            // Rafraîchir la page pour voir la recette complétée
            // Utiliser router.refresh() au lieu de window.location.reload() pour éviter les problèmes
            setTimeout(() => {
              window.location.reload()
            }, 500)
            return
          }

          if (data.statusMessage) {
            // Ne pas afficher les messages d'erreur techniques
            if (data.statusMessage.includes('revalidatePath') || data.statusMessage.includes('Route')) {
              setCurrentMessage('Traitement en cours...')
            } else {
              setCurrentMessage(data.statusMessage)
            }
            const foundIndex = messages.findIndex(msg => 
              data.statusMessage.toLowerCase().includes(msg.toLowerCase().split('...')[0])
            )
            if (foundIndex >= 0) {
              currentMsgIndex = foundIndex
              setMessageIndex(foundIndex)
              setProgress(Math.min(20 + (foundIndex * 20), 90))
            }
          } else {
            currentMsgIndex = Math.min(currentMsgIndex + 1, messages.length - 1)
            setMessageIndex(currentMsgIndex)
            setCurrentMessage(messages[currentMsgIndex])
            setProgress(Math.min(20 + (currentMsgIndex * 20), 90))
          }
        }
      } catch (error) {
        console.error('Error fetching recipe status:', error)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [recipeId, initialMessage])

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + 0.5
      })
    }, 500)

    return () => clearInterval(progressInterval)
  }, [])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
        <span className="text-muted-foreground flex-1 truncate">{currentMessage}</span>
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  )
}

