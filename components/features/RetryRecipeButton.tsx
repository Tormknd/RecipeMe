'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { retryRecipeAction } from '@/app/actions/recipes'
import { Button } from '@/components/ui/button'
import { RotateCcw, Loader2 } from 'lucide-react'

interface RetryRecipeButtonProps {
  recipeId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function RetryRecipeButton({ recipeId, variant = 'outline', size = 'sm' }: RetryRecipeButtonProps) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsRetrying(true)
    setError(null)

    try {
      const result = await retryRecipeAction(recipeId)
      
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Erreur lors de la nouvelle tentative')
        setIsRetrying(false)
      }
    } catch (err) {
      setError('Une erreur est survenue')
      setIsRetrying(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={variant}
        size={size}
        onClick={handleRetry}
        disabled={isRetrying}
        className="gap-2"
      >
        {isRetrying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">Traitement...</span>
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Réessayer</span>
          </>
        )}
      </Button>
      {error && (
        <div className="text-xs text-destructive mt-1">
          {error}
        </div>
      )}
    </div>
  )
}

