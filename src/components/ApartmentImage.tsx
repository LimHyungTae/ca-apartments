import { useEffect, useState } from 'react'
import { Icon } from './Icons'

interface ApartmentImageProps {
  alt: string
  className?: string
  src?: string
}

export function ApartmentImage({ alt, className = '', src }: ApartmentImageProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (!src || failed) {
    return (
      <div className={`image-placeholder ${className}`} role="img" aria-label={`${alt} 사진 없음`}>
        <Icon name="image" size={22} />
        <span>사진 준비 중</span>
      </div>
    )
  }

  return (
    <img
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  )
}
