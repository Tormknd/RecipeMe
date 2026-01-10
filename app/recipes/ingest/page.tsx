'use client'

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ingestRecipeAction, createRecipeAction } from "@/app/actions/recipes"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ChefHat, Sparkles, Image as ImageIcon, Link as LinkIcon, Upload, X, ArrowLeft, PenTool, Plus, Trash2, GripVertical } from "lucide-react"

export default function IngestPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState("url")
  const [url, setUrl] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>("En attente...")

  // État pour le formulaire manuel
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [cookTime, setCookTime] = useState("")
  const [servings, setServings] = useState("")
  const [tags, setTags] = useState("")
  const [ingredients, setIngredients] = useState<Array<{ name: string; quantity: string; unit: string }>>([{ name: "", quantity: "", unit: "" }])
  const [instructions, setInstructions] = useState<string[]>([""])

  useEffect(() => {
    const sharedUrl = searchParams.get('url') || searchParams.get('text')
    if (sharedUrl) {
      const extractedUrl = sharedUrl.match(/https?:\/\/[^\s]+/)
      if (extractedUrl) {
        setUrl(extractedUrl[0])
      } else {
        setUrl(sharedUrl)
      }
    }
  }, [searchParams])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files)
      setFiles(selectedFiles)
      
      const previewPromises = selectedFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(file)
        })
      })
      
      Promise.all(previewPromises).then((previewResults) => {
        setPreviews(previewResults)
      })
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (activeTab === 'manual') {
      if (!title.trim()) {
        setStatus("Le titre est requis")
        return
      }
      
      setIsLoading(true)
      setStatus("Création de la recette...")
      
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('prepTime', prepTime)
      formData.append('cookTime', cookTime)
      formData.append('servings', servings)
      formData.append('tags', tags)
      
      const ingredientsText = ingredients
        .filter(ing => ing.name.trim())
        .map(ing => `${ing.name}|${ing.quantity}|${ing.unit}`)
        .join('\n')
      formData.append('ingredients', ingredientsText)
      
      formData.append('instructions', instructions.filter(i => i.trim()).join('\n'))
      
      const result = await createRecipeAction(formData)
      
      if (result.success && result.recipeId) {
        setStatus("Recette créée !")
        setTimeout(() => {
          router.push(`/recipes/${result.recipeId}`)
        }, 500)
      } else {
        setStatus(`Erreur: ${result.error}`)
        setIsLoading(false)
      }
      return
    }
    
    if (activeTab === 'url' && !url) return
    if (activeTab === 'image' && files.length === 0) return
    
    setIsLoading(true)
    setStatus(activeTab === 'url' ? "Analyse de la page..." : `Analyse de ${files.length} image${files.length > 1 ? 's' : ''}...`)
    
    const formData = new FormData()
    if (activeTab === 'url') {
      formData.append('url', url)
    } else {
      files.forEach((file) => {
        formData.append('files', file)
      })
    }

    const timer = setTimeout(() => setStatus(activeTab === 'url' ? "Extraction des ingrédients..." : "Vision par ordinateur..."), 2000)
    const timer2 = setTimeout(() => setStatus("Structuration de la recette..."), activeTab === 'image' ? 6000 : 4500)

    const result = await ingestRecipeAction(formData)
    
    clearTimeout(timer)
    clearTimeout(timer2)

    if (result.success && result.recipeId) {
      setStatus("Recette créée ! Traitement en cours...")
      setTimeout(() => {
        router.push('/recipes')
      }, 1000)
    } else {
      setStatus(`Erreur: ${result.error}`)
      setIsLoading(false)
    }
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", quantity: "", unit: "" }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: 'name' | 'quantity' | 'unit', value: string) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addInstruction = () => {
    setInstructions([...instructions, ""])
  }

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index))
  }

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = value
    setInstructions(updated)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pt-safe">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6">
        
        <header className="flex items-center w-full mb-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0 h-10 w-10 -ml-2 sm:ml-0"
            disabled={isLoading}
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-start space-y-6 pb-6 overflow-y-auto">
          <div className="text-center space-y-4 w-full">
            <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif font-medium">Ajouter une recette</h1>
              <p className="text-muted-foreground text-sm px-4">Via lien, capture d'écran ou création manuelle</p>
            </div>
          </div>

        <Card className="border-border/50 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-muted/50 p-1">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="url" className="gap-2">
                  <LinkIcon className="w-4 h-4" /> Lien
                </TabsTrigger>
                <TabsTrigger value="image" className="gap-2">
                  <ImageIcon className="w-4 h-4" /> Capture
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <PenTool className="w-4 h-4" /> Manuel
                </TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <TabsContent value="url" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">Lien TikTok / Insta / Web</Label>
                    <div className="relative">
                      <Input 
                        id="url"
                        placeholder="https://..." 
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="pr-10"
                        disabled={isLoading}
                      />
                      {url && !isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file">Capture{files.length > 1 ? 's' : ''} d'écran de la recette</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors relative">
                      <input 
                        type="file" 
                        id="file" 
                        accept="image/*"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                      {previews.length === 0 ? (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground">Cliquez pour choisir une ou plusieurs images</span>
                        </>
                      ) : (
                        <div className="w-full space-y-3">
                          {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border/50">
                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    removeFile(index)
                                  }}
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                                  disabled={isLoading}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 text-center">
                                Image {index + 1} / {files.length}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {files.length > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        {files.length} image{files.length > 1 ? 's' : ''} sélectionnée{files.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ma recette personnalisée"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Une délicieuse recette..."
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="prepTime">Préparation</Label>
                      <Input
                        id="prepTime"
                        value={prepTime}
                        onChange={(e) => setPrepTime(e.target.value)}
                        placeholder="15 min"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cookTime">Cuisson</Label>
                      <Input
                        id="cookTime"
                        value={cookTime}
                        onChange={(e) => setCookTime(e.target.value)}
                        placeholder="30 min"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="servings">Portions</Label>
                      <Input
                        id="servings"
                        value={servings}
                        onChange={(e) => setServings(e.target.value)}
                        placeholder="4 personnes"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Italien, Dessert, Rapide"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Ingrédients</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addIngredient}
                        disabled={isLoading}
                        className="gap-2 h-8"
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {ingredients.map((ing, index) => (
                        <div key={index} className="flex gap-2 items-center p-2 rounded-lg border border-border/30 bg-background/50">
                          <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                          <Input
                            placeholder="Nom"
                            value={ing.name}
                            onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                            disabled={isLoading}
                            className="flex-1"
                          />
                          <Input
                            placeholder="Quantité"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                            disabled={isLoading}
                            className="w-24"
                          />
                          <Input
                            placeholder="Unité"
                            value={ing.unit}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                            disabled={isLoading}
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeIngredient(index)}
                            disabled={isLoading || ingredients.length === 1}
                            className="text-destructive hover:text-destructive shrink-0 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Instructions</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addInstruction}
                        disabled={isLoading}
                        className="gap-2 h-8"
                      >
                        <Plus className="w-3 h-3" />
                        Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {instructions.map((instruction, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-none w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-1 shrink-0">
                            {index + 1}
                          </div>
                          <Textarea
                            placeholder={`Étape ${index + 1}...`}
                            value={instruction}
                            onChange={(e) => updateInstruction(index, e.target.value)}
                            disabled={isLoading}
                            rows={2}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeInstruction(index)}
                            disabled={isLoading || instructions.length === 1}
                            className="text-destructive hover:text-destructive shrink-0 h-8 w-8 mt-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    isLoading || 
                    (activeTab === 'url' ? !url : activeTab === 'image' ? files.length === 0 : !title.trim())
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {status}
                    </>
                  ) : (
                    activeTab === 'manual' ? "Créer la recette" : "Analyser et Importer"
                  )}
                </Button>
              </form>
            </CardContent>
          </Tabs>
        </Card>

          <div className="text-center text-xs text-muted-foreground/60 pt-4">
            Powered by Gemini 2.5 Flash Vision
          </div>
        </div>
      </div>
    </div>
  )
}

