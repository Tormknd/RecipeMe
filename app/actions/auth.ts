'use server'

import { prisma } from '@/lib/prisma'
import { createSession, destroySession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const SignupSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  name: z.string().optional(),
})

const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

export type AuthResult = {
  success: boolean
  error?: string
  redirectUrl?: string
}

export async function signup(formData: FormData): Promise<AuthResult> {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string | null

    const validated = SignupSchema.parse({ 
      email, 
      password, 
      name: name || undefined 
    })

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (existingUser) {
      return { success: false, error: 'Cet email est déjà utilisé' }
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10)

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name || null,
      },
    })

    await createSession(user.id)

    return { success: true, redirectUrl: '/recipes' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors?.[0]?.message || 'Données invalides'
      console.error('Zod Validation Error:', JSON.stringify(error.errors, null, 2))
      return { success: false, error: errorMessage }
    }
    
    console.error('Signup Error:', error)
    return { success: false, error: 'Une erreur est survenue lors de l\'inscription' }
  }
}

export async function login(formData: FormData): Promise<AuthResult> {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validated = LoginSchema.parse({ email, password })

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    const isValidPassword = await bcrypt.compare(validated.password, user.password)

    if (!isValidPassword) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    await createSession(user.id)

    return { success: true, redirectUrl: '/recipes' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors?.[0]?.message || 'Données invalides'
      console.error('Zod Validation Error:', JSON.stringify(error.errors, null, 2))
      return { success: false, error: errorMessage }
    }
    
    console.error('Login Error:', error)
    return { success: false, error: 'Une erreur est survenue lors de la connexion' }
  }
}

export async function logout(): Promise<void> {
  await destroySession()
}

