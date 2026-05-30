import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  placeholderColor?: string;
  /** Distance from viewport to start loading (default: '200px') */
  rootMargin?: string;
}

function generateSrcSet(url: string | undefined): string | undefined {
  if (!url) return undefined;
  
  // Unsplash images
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    const params = new URLSearchParams(url.split('?')[1] || '');
    params.delete('w');
    params.delete('fit');
    const restParams = params.toString() ? `&${params.toString()}` : '';
    
    return [
      `${baseUrl}?auto=format&fit=crop&w=400&q=80${restParams} 400w`,
      `${baseUrl}?auto=format&fit=crop&w=800&q=80${restParams} 800w`,
      `${baseUrl}?auto=format&fit=crop&w=1200&q=80${restParams} 1200w`
    ].join(', ');
  }
  
  // Cloudinary images
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return [
        `${parts[0]}/upload/c_limit,w_400,q_auto,f_auto/${parts[1]} 400w`,
        `${parts[0]}/upload/c_limit,w_800,q_auto,f_auto/${parts[1]} 800w`,
        `${parts[0]}/upload/c_limit,w_1200,q_auto,f_auto/${parts[1]} 1200w`
      ].join(', ');
    }
  }
  
  return undefined;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderColor = '#f4f4f5',
  rootMargin = '200px',
  className = '',
  style,
  sizes,
  width,
  height,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const imageSrc = src?.trim();

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [imageSrc]);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div
      ref={imgRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: placeholderColor,
        ...style,
      }}
    >
      {isInView && imageSrc && !hasError && (
        <img
          src={imageSrc}
          srcSet={generateSrcSet(imageSrc)}
          sizes={sizes || "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          width={width}
          height={height}
          decoding="async"
          alt={alt}
          onLoad={handleLoad}
          onError={() => setHasError(true)}
          className={className}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.4s ease-in-out',
            opacity: isLoaded ? 1 : 0,
          }}
          referrerPolicy="no-referrer"
          {...rest}
        />
      )}
    </div>
  );
};
