'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/actions/auth'
import { Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)
      if (name.trim()) {
        formData.append('name', name.trim())
      }

      const result = await signup(formData)
      
      if (result?.error) {
        setError(result.error)
      } else if (result?.success && result?.redirectUrl) {
        router.push(result.redirectUrl)
        router.refresh()
      }
    } catch (err) {
      setError("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background">
      <div className="relative w-full max-w-[400px] mx-4">
        <div className="relative bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-border/50 p-8 flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-700">
          
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative w-14 h-14 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <Sparkles size={22} strokeWidth={1.5} />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-3xl font-light tracking-tight text-card-foreground font-serif">
              RecipeMe
            </h1>
            <p className="text-sm text-muted-foreground font-light tracking-wide">
              Créer un compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-card-foreground">Nom (optionnel)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  disabled={loading}
                  className="h-12 rounded-2xl bg-background/50 dark:bg-background/30 border-border text-card-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={loading}
                  className="h-12 rounded-2xl bg-background/50 dark:bg-background/30 border-border text-card-foreground placeholder:text-muted-foreground"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-12 rounded-2xl bg-background/50 dark:bg-background/30 border-border text-card-foreground placeholder:text-muted-foreground"
                  autoComplete="new-password"
                />
              </div>
              
              {error && (
                <div className="flex items-center justify-center space-x-2 animate-in fade-in slide-in-from-top-1 pt-2">
                  <div className="h-1 w-1 rounded-full bg-destructive"></div>
                  <p className="text-xs text-destructive font-medium">
                    {error}
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !email || password.length < 6}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center tracking-wide text-sm uppercase"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary-foreground/80" />
              ) : (
                "S'inscrire"
              )}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
        
        <p className="mt-8 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          RecipeMe • Recettes Intelligentes
        </p>
        <p className="mt-1 text-center text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
          Développé par Chhaju
        </p>
      </div>
    </div>
  )
}

