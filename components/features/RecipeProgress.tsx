'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface RecipeProgressProps {
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

export function RecipeProgress({ recipeId, initialMessage }: RecipeProgressProps) {
  const router = useRouter()
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
          
          if (data.status === 'completed') {
            setProgress(100)
            setCurrentMessage('Terminé !')
            setTimeout(() => router.refresh(), 500)
            return
          }
          
          if (data.status === 'error') {
            router.refresh()
            return
          }

          if (data.statusMessage) {
            setCurrentMessage(data.statusMessage)
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
  }, [recipeId, router, initialMessage])

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
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="text-muted-foreground font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
          <p className="text-foreground/80">{currentMessage}</p>
        </div>
      </CardContent>
    </Card>
  )
}

