import { z } from "zod"

export const IngredientSchema = z.object({
  name: z.string().describe("Nom de l'ingrédient"),
  quantity: z.string().optional().nullable().describe("Quantité (ex: 2, 1/2, 200)"),
  unit: z.string().optional().nullable().describe("Unité (ex: g, ml, tasse, cuillère à soupe)")
})

export const RecipeContentSchema = z.object({
  title: z.string().describe("Titre de la recette").nullable().transform(v => v || "Recette sans titre"),
  description: z.string().optional().nullable().describe("Courte description"),
  ingredients: z.array(IngredientSchema).describe("Liste des ingrédients"),
  instructions: z.array(z.string()).describe("Liste des étapes de préparation"),
  prepTime: z.string().optional().nullable().describe("Temps de préparation (ex: 15 min)"),
  cookTime: z.string().optional().nullable().describe("Temps de cuisson (ex: 30 min)"),
  servings: z.string().optional().nullable().describe("Nombre de personnes"),
  difficulty: z.enum(["Facile", "Moyen", "Difficile"]).optional().nullable().transform((v) => {
    if (!v || v === "N/A" || v === "null" || v === "") return null;
    return v;
  }),
  tags: z.array(z.string()).describe("Tags culinaires (ex: Italien, Dessert, Rapide)")
})

export type RecipeContent = z.infer<typeof RecipeContentSchema>

