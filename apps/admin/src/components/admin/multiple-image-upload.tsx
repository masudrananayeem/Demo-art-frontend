"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadImages } from "@/lib/cloudinary/upload"
import { toast } from "sonner"

interface MultipleImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  className?: string
}

export function MultipleImageUpload({
  images = [],
  onImagesChange,
  maxImages = 4,
  className,
}: MultipleImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = maxImages - images.length

    if (remainingSlots <= 0) {
      return
    }

    const filesToProcess = files.slice(0, remainingSlots)
    if (filesToProcess.length === 0) return

    try {
      setIsUploading(true)
      const results = await uploadImages(filesToProcess)
      const urls = results.map((r) => r.url).filter(Boolean)
      onImagesChange([...images, ...urls])
      if (urls.length > 0) toast.success("Images uploaded")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Image upload failed")
    } finally {
      setIsUploading(false)
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= images.length || to >= images.length) {
      return
    }
    const next = [...images]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onImagesChange(next)
  }

  const makePoster = (index: number) => {
    moveImage(index, 0)
  }

  const canAddMore = images.length < maxImages

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative group"
            draggable
            onDragStart={(e) => {
              // Don't start dragging when interacting with buttons inside the tile
              const target = e.target as HTMLElement | null
              if (target?.closest("button")) {
                e.preventDefault()
                return
              }
              setDragIndex(index)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null) return
              moveImage(dragIndex, index)
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className="aspect-square rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted/50">
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {index === 0 && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                Poster
              </div>
            )}
            {index !== 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 left-2 h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  makePoster(index)
                }}
              >
                Make poster
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                handleRemove(index)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {index + 1}/{maxImages}
            </div>
          </div>
        ))}

        {canAddMore && (
          <div
            className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/30"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground text-center px-2">
              Upload Image ({images.length}/{maxImages})
            </span>
          </div>
        )}
      </div>

      {canAddMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full"
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : `Add Image (${images.length}/${maxImages})`}
        </Button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {images.length >= maxImages && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum {maxImages} images allowed
        </p>
      )}
    </div>
  )
}
