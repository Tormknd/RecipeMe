'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChefHat } from "lucide-react"
import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()

  if (pathname === '/login') {
    return null
  }

  const isRecipesActive = pathname?.startsWith('/recipes')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/60 backdrop-blur-xl pb-safe">
      <div className="flex justify-center items-center h-16 md:h-20 max-w-md mx-auto">
        <Link 
          href="/recipes" 
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-14 h-full transition-all duration-300 shrink-0", 
            isRecipesActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
          )}
        >
          <div className={cn("p-1.5 rounded-2xl transition-all", isRecipesActive && "bg-primary/10")}>
            <ChefHat className={cn("h-5 w-5", isRecipesActive && "fill-current")} strokeWidth={isRecipesActive ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-medium tracking-wide">Recettes</span>
        </Link>
      </div>
    </nav>
  )
}

