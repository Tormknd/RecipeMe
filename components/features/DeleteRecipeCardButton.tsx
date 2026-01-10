'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteRecipeAction } from "@/app/actions/recipes"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DeleteRecipeCardButtonProps {
  recipeId: string
  recipeTitle: string
  onDeleted?: () => void
}

export function DeleteRecipeCardButton({ recipeId, recipeTitle, onDeleted }: DeleteRecipeCardButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsDeleting(true)
    const result = await deleteRecipeAction(recipeId)
    
    if (result.success) {
      if (onDeleted) {
        onDeleted()
      }
      router.refresh()
      setOpen(false)
    } else {
      alert(result.error || "Erreur lors de la suppression")
      setIsDeleting(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute top-2 right-2 z-10 size-8 opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-destructive/10 hover:text-destructive"
          )}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la recette ?</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer "{recipeTitle}" ? Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Suppression...
              </>
            ) : (
              "Supprimer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

