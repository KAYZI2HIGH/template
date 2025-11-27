"use client";
import { useEffect, useState } from "react";

export function LoadingBar() {
  const [isVisible, setIsVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Trigger loading bar on mount
    setIsVisible(true);
    setWidth(30);

    // Simulate progress
    const interval = setInterval(() => {
      setWidth((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 500);

    // Complete on finish
    const timeout = setTimeout(() => {
      setWidth(100);
      setTimeout(() => setIsVisible(false), 500);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-0 left-0 h-1 bg-gradient-to-r from-green-500 via-green-400 to-green-300 transition-all duration-500 ease-out z-50"
      style={{ width: `${width}%`, opacity: width === 100 ? 0 : 1 }}
    />
  );
}
