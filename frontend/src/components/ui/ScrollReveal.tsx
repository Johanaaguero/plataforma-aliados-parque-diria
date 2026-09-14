import { useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  stagger?: boolean;
}

/** Presentational viewport reveal. It observes once and never runs work while scrolling. */
export default function ScrollReveal({
  children,
  className = '',
  stagger = false,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { threshold: 0.15 });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`sigtad-observe ${stagger ? 'sigtad-observe-stagger' : ''} ${visible ? 'is-visible' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
