import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai"
import { RecipeContentSchema, type RecipeContent } from "./schemas"
import { z } from "zod"
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

if (!process.env.GEMINI_API_KEY && process.env.NODE_ENV !== 'production') {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    dotenv.config({ path: envPath })
    
    if (!process.env.GEMINI_API_KEY && fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8')
        const cleanContent = envContent.replace(/\0/g, '')
        const lines = cleanContent.split('\n')
        for (const line of lines) {
            const cleanLine = line.trim()
            if (cleanLine.startsWith('GEMINI_API_KEY=')) {
                const value = cleanLine.split('=').slice(1).join('=').trim()
                process.env.GEMINI_API_KEY = value.replace(/^["']|["']$/g, '')
            }
            if (cleanLine.startsWith('RECIPE_SCRAPER_URL=')) {
                const value = cleanLine.split('=').slice(1).join('=').trim()
                process.env.RECIPE_SCRAPER_URL = value.replace(/^["']|["']$/g, '')
            }
        }
    }
  } catch (e) {
    // Silent fail
  }
}

const API_KEY = process.env.GEMINI_API_KEY

if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY manquante dans les variables d'environnement.")
}

const genAI = new GoogleGenerativeAI(API_KEY || "")

interface ScraperAPIRecipe {
  id?: string;
  title: string;
  ingredients: string[];
  steps: string[];
  source_url: string;
  servings?: string;
  prep_time?: string;
  cook_time?: string;
  tips?: string[];
}

interface ScraperAPIResponse {
  success: boolean;
  method?: 'web_scraping' | 'video_ai';
  data?: ScraperAPIRecipe;
  error?: string;
  progress?: {
    stage?: string;
    message?: string;
    percentage?: number;
  };
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
    costEUR?: number;
  };
}

function parseIngredient(ingredientStr: string): { name: string; quantity: string | null; unit: string | null } {
  const trimmed = ingredientStr.trim();
  if (!trimmed) {
    return { name: trimmed, quantity: null, unit: null };
  }

  const quantityUnitPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s*([a-zA-Zàâäéèêëïîôöùûüÿç\s]+?)\s+de\s+(.+)$/i;
  const match = trimmed.match(quantityUnitPattern);
  
  if (match) {
    return {
      name: match[3].trim(),
      quantity: match[1],
      unit: match[2].trim()
    };
  }

  const simpleQuantityPattern = /^(\d+(?:\/\d+)?)\s+(.+)$/;
  const simpleMatch = trimmed.match(simpleQuantityPattern);
  
  if (simpleMatch) {
    return {
      name: simpleMatch[2].trim(),
      quantity: simpleMatch[1],
      unit: null
    };
  }

  return {
    name: trimmed,
    quantity: null,
    unit: null
  };
}

function convertAPIRecipeToRecipeContent(apiRecipe: ScraperAPIRecipe): RecipeContent {
  const parsedIngredients = (apiRecipe.ingredients || []).map(parseIngredient);

  const tags: string[] = [];
  
  return {
    title: apiRecipe.title || "Recette sans titre",
    description: null,
    ingredients: parsedIngredients,
    instructions: apiRecipe.steps || [],
    prepTime: apiRecipe.prep_time || null,
    cookTime: apiRecipe.cook_time || null,
    servings: apiRecipe.servings || null,
    difficulty: null,
    tags: tags
  };
}

async function fetchSocialMediaContent(
  url: string, 
  onProgress?: (message: string) => Promise<void>
): Promise<RecipeContent | null> {
  try {
    let baseUrl = process.env.RECIPE_SCRAPER_URL || "http://localhost:5000";
    baseUrl = baseUrl.trim().replace(/^["']|["']$/g, '');
    
    if (!baseUrl || baseUrl === '""' || baseUrl === "''") {
      baseUrl = "http://localhost:5000";
    }
    
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`;
    }
    
    const scraperUrl = baseUrl.endsWith('/') ? `${baseUrl}process` : `${baseUrl}/process`;
    console.log(`🤖 Calling Scraper API for social media content: ${url}`);
    console.log(`🔗 Scraper API URL: ${scraperUrl}`);
    
    const response = await fetch(scraperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Scraper API Error Response:", errorData);
      throw new Error(errorData.error || `Scraper API Error: ${response.statusText}`);
    }

    const json: ScraperAPIResponse = await response.json();
    
    console.log("📦 Scraper API Raw Response:", JSON.stringify(json, null, 2));
    
    // Utiliser les messages de progression de l'API si disponibles
    // Note: On ne reçoit que le dernier message car c'est une requête HTTP synchrone
    // Les messages intermédiaires sont perdus, mais on peut utiliser le dernier message
    if (json.progress && json.progress.message) {
      console.log(`📊 API Progress: ${json.progress.stage || 'N/A'} - ${json.progress.message || 'En cours...'} (${json.progress.percentage || 0}%)`);
      if (onProgress) {
        await onProgress(json.progress.message);
      }
    }
    
    if (!json.success || !json.data) {
      console.error("❌ Scraper API returned error or no data:", json);
      throw new Error(json.error || "Failed to scrape social media content");
    }
    
    // Mettre à jour avec le dernier message de progression si disponible
    if (json.progress && json.progress.message && onProgress) {
      await onProgress(json.progress.message);
    }

    if (json.method) {
      console.log(`📊 Scraper API method: ${json.method}`);
      if (json.usage) {
        console.log(`📊 API usage: ${json.usage.totalTokens} tokens, ~${json.usage.costEUR?.toFixed(4)}€`);
      }
    }

    console.log("📋 Scraper API Recipe Data:", JSON.stringify(json.data, null, 2));

    try {
      const recipeContent = convertAPIRecipeToRecipeContent(json.data);
      
      console.log(`✅ Scraper API returned structured recipe: ${recipeContent.title}`);
      console.log("🍳 Converted Recipe Content:", JSON.stringify(recipeContent, null, 2));
      return recipeContent;
    } catch (conversionError: any) {
      console.error("❌ Error converting API recipe to RecipeContent:", conversionError);
      console.error("❌ Raw API data that failed conversion:", JSON.stringify(json.data, null, 2));
      throw new Error(`Erreur lors de la conversion de la recette: ${conversionError?.message || 'Erreur inconnue'}`);
    }
    
  } catch (error: any) {
    console.error("Error calling Scraper API:", error);
    
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
      throw new Error("Le service de scraping n'est pas accessible. Vérifiez que le conteneur recipe-scraper-api est bien lancé et que la variable RECIPE_SCRAPER_URL est correctement configurée.");
    }
    
    // Si l'erreur a déjà un message, on le propage
    if (error?.message) {
      throw error;
    }
    
    throw new Error(`Erreur lors de l'appel au scraper API: ${error?.message || 'Erreur inconnue'}`);
  }
}

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Jina Reader Error: ${response.statusText}`)
    }
    
    return await response.text()
  } catch (error) {
    console.error("Error fetching URL content:", error)
    throw new Error("Impossible de lire le contenu de l'URL")
  }
}

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

export async function extractRecipeFromInput(
  input: string, 
  isUrl: boolean = true, 
  imageBuffers?: Buffer | { buffer: Buffer; mimeType: string }[], 
  mimeType?: string,
  onProgress?: (message: string) => Promise<void>
): Promise<RecipeContent> {
  
  const modelName = "gemini-2.5-flash" 
  
  const model = genAI.getGenerativeModel({ 
    model: modelName, 
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      }
    ]
  })

  let promptParts: any[] = []
  
  const systemPrompt = `
    Tu es un expert culinaire et un assistant d'extraction de données.
    Ton rôle est d'ANALYSER et de STRUCTURER les informations d'une recette à partir du contenu fourni.
    
    CONTEXTE D'UTILISATION :
    Les captures d'écran fournies sont destinées à un usage STRICTEMENT PERSONNEL pour permettre à l'utilisateur de garder en mémoire une recette qu'il souhaite cuisiner. 
    Il ne s'agit PAS d'une reproduction pour du contenu commercial, publication, ou redistribution. 
    L'objectif est uniquement d'aider l'utilisateur à organiser ses recettes personnelles dans sa collection privée.
    
    IMPORTANT : 
    - Tu dois EXTRAIRE et RESTRUCTURER les informations, pas recopier mot pour mot
    - Reformule les instructions dans tes propres mots tout en conservant le sens et les proportions
    - Organise les ingrédients de manière claire et structurée
    - Si certaines informations manquent, utilise null ou des valeurs par défaut appropriées
    - L'extraction sert uniquement à créer une référence personnelle structurée, pas à reproduire le contenu original
    
    Retourne UNIQUEMENT un objet JSON valide (sans Markdown, sans \`\`\`json) correspondant à ce schéma :
    {
      "title": "Titre",
      "description": "Description",
      "ingredients": [{"name": "Nom", "quantity": "Quantité", "unit": "Unité"}],
      "instructions": ["Étape 1"],
      "prepTime": "XX min",
      "cookTime": "XX min",
      "servings": "X personnes",
      "difficulty": "Facile",
      "tags": ["Tag"]
    }
  `
  promptParts.push(systemPrompt)

    if (imageBuffers) {
      if (onProgress) {
        await onProgress('Analyse des images...')
      }
      
      if (Array.isArray(imageBuffers)) {
        console.log(`👁️ Processing ${imageBuffers.length} Images...`)
        imageBuffers.forEach((img, index) => {
          promptParts.push(fileToGenerativePart(img.buffer, img.mimeType))
        })
        promptParts.push(
          `Analyse ces ${imageBuffers.length} image${imageBuffers.length > 1 ? 's' : ''} de recette (capture${imageBuffers.length > 1 ? 's' : ''} d'écran ou photo${imageBuffers.length > 1 ? 's' : ''} de plat). ` +
          `Ces captures d'écran sont destinées à un usage STRICTEMENT PERSONNEL pour permettre à l'utilisateur de garder en mémoire cette recette dans sa collection privée. ` +
          `Il ne s'agit PAS d'une reproduction pour du contenu commercial ou public. ` +
          `Extrais toutes les informations de la recette en combinant le contenu de toutes les images. ` +
          `Si les images montrent différentes parties de la recette (ingrédients, étapes, etc.), combine-les pour créer une recette complète. ` +
          `IMPORTANT : Reformule les instructions dans tes propres mots, ne recopie pas mot pour mot le texte original. Structure les informations de manière claire et organisée pour créer une référence personnelle structurée.`
        )
      } else {
        console.log("👁️ Processing Image...")
        const buffer = imageBuffers as Buffer
        const mime = mimeType || 'image/jpeg'
        promptParts.push(fileToGenerativePart(buffer, mime))
        promptParts.push(
          "Analyse cette image de recette (capture d'écran ou photo de plat). " +
          "Cette capture d'écran est destinée à un usage STRICTEMENT PERSONNEL pour permettre à l'utilisateur de garder en mémoire cette recette dans sa collection privée. " +
          "Il ne s'agit PAS d'une reproduction pour du contenu commercial ou public. " +
          "Extrais toutes les informations et structure-les de manière claire. " +
          "IMPORTANT : Reformule les instructions dans tes propres mots, ne recopie pas mot pour mot le texte original. Structure les informations pour créer une référence personnelle structurée."
        )
      }
      
      if (onProgress) {
        await onProgress('Extraction des ingrédients avec Gemini...')
      }
    }
  else {
    if (isUrl && input.startsWith('http')) {
      console.log("🔍 Fetching content from:", input)
      
      const isSocialMedia = input.includes('instagram.com') || input.includes('tiktok.com') || input.includes('facebook.com');
      
      try {
        if (isSocialMedia) {
          try {
            const recipeContent = await fetchSocialMediaContent(input, onProgress);
            if (recipeContent) {
              console.log("✅ Using structured recipe from Scraper API (no Gemini reprocessing needed)");
              console.log("✅ Recipe content:", JSON.stringify(recipeContent, null, 2));
              return recipeContent;
            }
            console.warn("⚠️ Scraper API returned null, falling back to Gemini processing");
            if (onProgress) {
              await onProgress('Analyse du contenu avec Gemini...')
            }
            promptParts.push(`Texte à analyser :\n"""\n${input.slice(0, 20000)}\n"""`)
          } catch (socialMediaError: any) {
            console.error("❌ Error in fetchSocialMediaContent:", socialMediaError);
            console.error("❌ Error stack:", socialMediaError?.stack);
            throw socialMediaError; // Re-throw pour que le catch parent le gère
          }
        } else {
          if (onProgress) {
            await onProgress('Récupération du contenu...')
          }
          const contextText = await fetchUrlContent(input);
          if (onProgress) {
            await onProgress('Extraction des informations...')
          }
          promptParts.push(`Texte à analyser :\n"""\n${contextText.slice(0, 20000)}\n"""`)
        }
      } catch (e: any) {
        if (isSocialMedia) {
          console.error("Fetch failed for social media:", e);
          throw new Error(e?.message || "Impossible de récupérer le contenu depuis le réseau social. Vérifiez que le scraper API est accessible.");
        }
        console.warn("Fetch failed, falling back to raw URL analysis by Gemini knowledge", e)
        promptParts.push(`Texte à analyser :\n"""\n${input.slice(0, 20000)}\n"""`)
      }
    } else {
      promptParts.push(`Texte à analyser :\n"""\n${input.slice(0, 20000)}\n"""`)
    }
  }

  let result
  let response
  let text
  
  try {
    result = await model.generateContent(promptParts)
    response = result.response
    text = response.text()
  } catch (error: any) {
    if (error?.message?.includes('RECITATION') || error?.response?.promptFeedback?.blockReason === 'RECITATION') {
      console.error("RECITATION Error:", error)
      throw new Error(
        "Le contenu de la recette semble être protégé par le droit d'auteur. " +
        "Essayez de reformuler manuellement les instructions ou utilisez une autre source."
      )
    }
    throw error
  }

  if (onProgress) {
    await onProgress('Structuration de la recette...')
  }

  try {
    const json = JSON.parse(text)
    
    if (json.difficulty === "N/A" || json.difficulty === "null" || json.difficulty === "") {
      json.difficulty = null;
    }
    if (json.prepTime === "N/A" || json.prepTime === "null" || json.prepTime === "") {
      json.prepTime = null;
    }
    if (json.cookTime === "N/A" || json.cookTime === "null" || json.cookTime === "") {
      json.cookTime = null;
    }
    if (json.servings === "N/A" || json.servings === "null" || json.servings === "") {
      json.servings = null;
    }
    if (json.title === "N/A" || json.title === "null" || json.title === "") {
      json.title = "Recette sans titre";
    }
    
    if (json.ingredients && Array.isArray(json.ingredients)) {
      json.ingredients = json.ingredients.map((ing: any) => ({
        name: ing.name || "",
        quantity: ing.quantity === null ? undefined : ing.quantity,
        unit: ing.unit === null ? undefined : ing.unit
      }))
    }
    
    return RecipeContentSchema.parse(json)
  } catch (error: any) {
    console.error("AI Parsing Error:", error)
    console.log("Raw Response:", text)
    
    if (error?.message?.includes('RECITATION') || error?.message?.includes('recitation')) {
      throw error
    }
    
    throw new Error("L'IA n'a pas réussi à générer une recette valide.")
  }
}

