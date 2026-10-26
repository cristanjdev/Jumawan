import { useState, useRef, useEffect } from 'react'

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackIcon?: React.ReactNode
}

export const OptimizedImage = ({
  src,
  alt,
  className = '',
  fallbackIcon,
  onError,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false)
  // Set once the image starts downloading; until then the placeholder stays still, so cards waiting
  // off screen (most of a carousel) don't keep a spinner animating for nothing
  const [requested, setRequested] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRequested(true)
          img.src = src
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(img)
    return () => observer.disconnect()
  }, [src])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    onError?.(e)
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-navy-700 rounded-lg ${className}`}>
        {fallbackIcon || (
          <div className="text-muted-foreground text-center">
            <div className="w-8 h-8 mx-auto mb-1">📷</div>
            <span className="text-xs">Image</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && (
        <div className={`absolute inset-0 flex items-center justify-center bg-navy-700 rounded-lg ${requested ? 'animate-pulse' : ''}`}>
          {requested && <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
        </div>
      )}
      <img
        ref={imgRef}
        data-src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
    </div>
  )
}
