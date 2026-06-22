"use client"

import Image from "next/image"
import { useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { Reveal } from "@/components/reveal"
import { SectionHeading } from "@/components/section-heading"
import type { GalleryImage, PageContent } from "@/lib/types"

interface GalleryProps {
  gallery: GalleryImage[]
  section?: PageContent["gallerySection"]
}

export function Gallery({ gallery, section }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  // Only images that have a source and are not hidden render publicly.
  const images = (gallery || []).filter((img) => img?.src && img.visible !== false)

  const openLightbox = (index: number) => setSelectedImage(index)
  const closeLightbox = () => setSelectedImage(null)

  const goToPrevious = () => {
    if (selectedImage === null) return
    setSelectedImage(selectedImage === 0 ? images.length - 1 : selectedImage - 1)
  }

  const goToNext = () => {
    if (selectedImage === null) return
    setSelectedImage(selectedImage === images.length - 1 ? 0 : selectedImage + 1)
  }

  // Hide when explicitly disabled, or when there are no visible images to show.
  if (section?.visible === false) return null
  if (images.length === 0) return null

  return (
    <section id="gallery" className="py-24 bg-[#F5E3C2]">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionHeading
            eyebrow={section?.eyebrow || "Galéria"}
            title={section?.title || "Náš kávový bicykel"}
            description={section?.subtitle || "Pohľad do sveta Golden Lama — remeselná káva, atmosféra a komunita."}
            tone="dark"
          />
        </Reveal>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
          {images.map((image, index) => (
            <Reveal key={`gallery-${index}`} delay={(index % 4) * 80}>
              <button
                onClick={() => openLightbox(index)}
                className="relative aspect-square w-full overflow-hidden rounded-xl group cursor-pointer shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E09E14]"
                aria-label={`Otvoriť obrázok: ${image.alt}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#28170F]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {image.caption && (
                  <span className="absolute bottom-3 left-3 right-3 text-left text-sm font-medium text-[#F5E3C2] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {image.caption}
                  </span>
                )}
              </button>
            </Reveal>
          ))}
        </div>

        {/* Lightbox */}
        {selectedImage !== null && (
          <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center animate-fade-in"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Zatvoriť"
            >
              <X className="h-8 w-8" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              className="absolute left-4 md:left-8 p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Predchádzajúci obrázok"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>

            <div className="relative w-full max-w-4xl h-[70vh] mx-4" onClick={(e) => e.stopPropagation()}>
              <Image
                src={images[selectedImage].src || "/placeholder.svg"}
                alt={images[selectedImage].alt}
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              className="absolute right-4 md:right-8 p-2 text-foreground hover:text-primary transition-colors"
              aria-label="Nasledujúci obrázok"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
