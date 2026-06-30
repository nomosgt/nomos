"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, animate } from "framer-motion";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  className?: string;
}

export function CountUp({
  to,
  from = 0,
  duration = 2.4,
  prefix = "",
  suffix = "",
  separator = ".",
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(from);
  const mv = useMotionValue(from);
  const startedRef = useRef(false);

  useEffect(() => {
    const startAnimation = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      animate(mv, to, {
        duration,
        ease: [0.22, 1, 0.36, 1],
        onUpdate: (v) => setDisplay(Math.round(v)),
      });
    };

    const node = ref.current;

    if (typeof IntersectionObserver === "undefined" || !node) {
      startAnimation();
      return;
    }

    const hardFallback = setTimeout(startAnimation, 1500);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            clearTimeout(hardFallback);
            startAnimation();
            observer.disconnect();
          }
        }
      },
      { threshold: [0, 0.01, 0.1, 0.5] },
    );

    observer.observe(node);

    return () => {
      clearTimeout(hardFallback);
      observer.disconnect();
    };
  }, [mv, to, duration]);

  const formatted = display
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, separator);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
