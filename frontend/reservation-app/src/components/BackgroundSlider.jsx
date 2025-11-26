import React, { useEffect, useRef, useState } from "react";

/**
 * 背景画像をフェード付きでランダム切り替えするコンポーネント
 */
export default function BackgroundSlider({
  images,
  intervalMs = 8000,
  fadeMs = 1000,
  targetOpacity = 0.15,
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const fadeTimeoutRef = useRef(null);

  useEffect(() => {
    if (!images || images.length === 0) {
      return undefined;
    }

    const clearFadeTimeout = () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    };

    const switchImage = () => {
      setIsVisible(false);

      clearFadeTimeout();
      fadeTimeoutRef.current = setTimeout(() => {
        setCurrentImageIndex((prev) => {
          if (images.length === 1) return prev;
          let next = Math.floor(Math.random() * images.length);
          if (next === prev) {
            next = (next + 1) % images.length;
          }
          return next;
        });
        setIsVisible(true);
      }, fadeMs);
    };

    const intervalId = setInterval(switchImage, intervalMs);

    return () => {
      clearInterval(intervalId);
      clearFadeTimeout();
    };
  }, [images, intervalMs, fadeMs]);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <img
      src={images[currentImageIndex]}
      className="bg-slide-image"
      style={{ opacity: isVisible ? targetOpacity : 0 }}
      alt="background slide"
    />
  );
}

