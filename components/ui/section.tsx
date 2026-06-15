import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes } from "react";

export const Container = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mx-auto w-full max-w-[1440px] px-6 lg:px-12", className)}
      {...props}
    />
  )
);
Container.displayName = "Container";

export const Section = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <section
      ref={ref}
      className={cn("relative py-24 lg:py-36", className)}
      {...props}
    />
  )
);
Section.displayName = "Section";

interface EyebrowProps extends HTMLAttributes<HTMLDivElement> {
  number?: string;
}

export const Eyebrow = forwardRef<HTMLDivElement, EyebrowProps>(
  ({ className, children, number, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-ink-muted)]",
        className
      )}
      {...props}
    >
      {number && (
        <span className="text-[color:var(--color-brand)]">{number}</span>
      )}
      <span className="h-px w-8 bg-[color:var(--color-hairline)]" />
      {children}
    </div>
  )
);
Eyebrow.displayName = "Eyebrow";
