"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadImage } from "@/lib/cloudinary/upload"
import { toast } from "sonner"

interface ImageUploadProps {
  currentImage?: string
  onImageChange: (imageUrl: string) => void
  className?: string
}

export function ImageUpload({ currentImage, onImageChange, className }: ImageUploadProps) {
  // Normalize currentImage: treat empty string as undefined
  const normalizedCurrentImage = currentImage && currentImage.trim() !== '' ? currentImage : undefined
  const [preview, setPreview] = useState<string | undefined>(normalizedCurrentImage)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [original, setOriginal] = useState<string | undefined>(normalizedCurrentImage)
  const [cropPreview, setCropPreview] = useState<string | undefined>(undefined)
  const [showCropper, setShowCropper] = useState(false)
  const [isCropping, setIsCropping] = useState(false)
  const [previewBeforeReposition, setPreviewBeforeReposition] = useState<string | undefined>(normalizedCurrentImage)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null)

  const CROP_VIEWPORT = 256
  const OUTPUT_SIZE = 512

  const baseScale = useMemo(() => {
    if (!naturalSize) return 1
    // cover the square viewport (like background-size: cover)
    return Math.max(CROP_VIEWPORT / naturalSize.w, CROP_VIEWPORT / naturalSize.h)
  }, [naturalSize])

  const totalScale = baseScale

  const [isMounted, setIsMounted] = useState(false)
  
  // Track mount state to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sync preview state when currentImage prop changes
  useEffect(() => {
    // Handle both undefined and empty string as "no image"
    const imageUrl = currentImage && currentImage.trim() !== '' ? currentImage : undefined
    
    setPreview(imageUrl)
    setOriginal(imageUrl)
  }, [currentImage])

  // Reset crop controls when a new image is opened for cropping
  useEffect(() => {
    if (!showCropper) return
    setOffset({ x: 0, y: 0 })
  }, [showCropper, cropPreview])

  // Simple client-side compression to reduce avatar size
  const compressToDataUrl = (file: File, maxWidth = 512, maxHeight = 512, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width
              width = maxWidth
            } else {
              width = (width * maxHeight) / height
              height = maxHeight
            }
          }

          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL("image/jpeg", quality)
          resolve(dataUrl)
        }
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  const cropToSquare = (dataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const natW = img.width
        const natH = img.height

        // compute displayed image size inside viewport
        const displayW = natW * totalScale
        const displayH = natH * totalScale

        // image top-left in viewport coords (centered + offset)
        const imgX = (CROP_VIEWPORT - displayW) / 2 + offset.x
        const imgY = (CROP_VIEWPORT - displayH) / 2 + offset.y

        // source rect in natural coords that maps to viewport
        let sx = (0 - imgX) / totalScale
        let sy = (0 - imgY) / totalScale
        const sSize = CROP_VIEWPORT / totalScale

        // clamp to image bounds
        sx = Math.max(0, Math.min(sx, natW - sSize))
        sy = Math.max(0, Math.min(sy, natH - sSize))

        const canvas = document.createElement("canvas")
        canvas.width = OUTPUT_SIZE
        canvas.height = OUTPUT_SIZE
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("No canvas context"))
        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
        resolve(canvas.toDataURL("image/jpeg", 0.88))
      }
      img.onerror = () => reject(new Error("Failed to load image for crop"))
      img.src = dataUrl
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const loadAndSet = (dataUrl: string) => {
      // Don't apply the new image until user confirms (Save / Use original)
      setPreviewBeforeReposition(preview)
      setOriginal(dataUrl)
      setCropPreview(dataUrl)
      setShowCropper(true) // prompt user to crop after upload
    }

    compressToDataUrl(file)
      .then(loadAndSet)
      .catch(() => {
        // Fallback to original if compression fails
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          loadAndSet(result)
        }
        reader.readAsDataURL(file)
      })
  }

  const handleRemove = () => {
    setPreview(undefined)
    setOriginal(undefined)
    setCropPreview(undefined)
    setShowCropper(false)
    onImageChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Convert data URL to File for upload
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',')
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  }

  const handleSaveReposition = async () => {
    if (!cropPreview) return
    setIsCropping(true)
    setIsUploading(true)
    try {
      const cropped = await cropToSquare(cropPreview)
      setPreview(cropped)
      
      // Convert data URL to File and upload to Cloudinary
      try {
        const file = dataURLtoFile(cropped, 'profile-avatar.jpg')
        const uploadResult = await uploadImage(file)
        // Use Cloudinary URL instead of base64
        setPreview(uploadResult.url)
        onImageChange(uploadResult.url)
        toast.success("Profile picture uploaded successfully")
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload image"
        toast.error(errorMessage || "Failed to upload image. Please try again.")
        // Fallback to base64 if upload fails (for development/testing)
        onImageChange(cropped)
      }
      } catch (err) {
        // fall back to original
      setPreview(cropPreview)
      // Try to upload original if crop failed
      try {
        const file = dataURLtoFile(cropPreview, 'profile-avatar.jpg')
        const uploadResult = await uploadImage(file)
        setPreview(uploadResult.url)
        onImageChange(uploadResult.url)
        toast.success("Profile picture uploaded successfully")
      } catch (uploadError) {
        const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload image"
        toast.error(errorMessage || "Failed to upload image. Please try again.")
        onImageChange(cropPreview)
      }
    } finally {
      setIsCropping(false)
      setIsUploading(false)
      setShowCropper(false)
    }
  }

  const handleUseOriginal = async () => {
    if (!cropPreview) return
    setIsUploading(true)
    setPreview(cropPreview)
    
    // Upload original to Cloudinary
    try {
      const file = dataURLtoFile(cropPreview, 'profile-avatar.jpg')
      const uploadResult = await uploadImage(file)
      setPreview(uploadResult.url)
      onImageChange(uploadResult.url)
      toast.success("Profile picture uploaded successfully")
    } catch (uploadError) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload image"
      toast.error(errorMessage || "Failed to upload image. Please try again.")
      // Fallback to base64 if upload fails
      onImageChange(cropPreview)
    } finally {
      setIsUploading(false)
      setShowCropper(false)
    }
  }

  const handleCloseReposition = () => {
    // Closing should NOT apply the uploaded image; revert preview
    setPreview(previewBeforeReposition)
    setShowCropper(false)
    setCropPreview(undefined)
    setNaturalSize(null)
    // Reset file input so selecting the same file again triggers change
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // For this component we always load the image URL directly.
  // Values are either data URLs or trusted Cloudinary URLs returned from our API.
  const imageSrc = isMounted ? preview : undefined

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <Avatar className="h-20 w-20">
        <AvatarImage 
          src={imageSrc || undefined} 
          alt="Profile"
          onError={() => {
            // Image failed to load, fallback will be shown
          }}
        />
        <AvatarFallback>IMG</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Image
        </Button>
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-destructive"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {showCropper && cropPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-lg shadow-xl p-3 w-full max-w-sm space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Reposition</div>
              <button
                type="button"
                onClick={handleCloseReposition}
                className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-center">
              <div
                className="relative overflow-hidden rounded-md bg-black/10 select-none touch-none"
                style={{ width: CROP_VIEWPORT, height: CROP_VIEWPORT }}
                onPointerDown={(e) => {
                  ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
                  dragRef.current = {
                    startX: e.clientX,
                    startY: e.clientY,
                    startOffsetX: offset.x,
                    startOffsetY: offset.y,
                  }
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current) return
                  const dx = e.clientX - dragRef.current.startX
                  const dy = e.clientY - dragRef.current.startY
                  setOffset({
                    x: dragRef.current.startOffsetX + dx,
                    y: dragRef.current.startOffsetY + dy,
                  })
                }}
                onPointerUp={() => {
                  dragRef.current = null
                }}
                onPointerCancel={() => {
                  dragRef.current = null
                }}
              >
                <img
                  src={cropPreview}
                  alt="Reposition preview"
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
                  }}
                  className="absolute left-1/2 top-1/2 will-change-transform"
                  style={{
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${totalScale})`,
                    transformOrigin: "center",
                    maxWidth: "none",
                    maxHeight: "none",
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseReposition}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseOriginal}
              >
                Use original
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveReposition}
                disabled={isCropping || isUploading}
              >
                {isUploading ? "Uploading..." : isCropping ? "Processing..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
