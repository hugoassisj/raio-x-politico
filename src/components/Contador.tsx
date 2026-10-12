"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that counts up once when it scrolls into view. The final value is in the HTML from the
 * start (for search engines, screen readers and people who prefer reduced motion).
 */
export function Contador({ valor, formato = (n) => n.toLocaleString("pt-BR") }: { valor: number; formato?: (n: number) => string }) {
  const [atual, setAtual] = useState(valor);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const inicio = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - inicio) / 900);
        setAtual(Math.round(valor * (1 - (1 - p) ** 3)));
        if (p < 1) quadro = requestAnimationFrame(passo);
      };
      setAtual(0);
      quadro = requestAnimationFrame(passo);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [valor]);
  return (
    <span ref={ref}>
      {/* The animated number is hidden from screen readers, which read the final value */}
      <span aria-hidden>{formato(atual)}</span>
      <span className="sr-only">{formato(valor)}</span>
    </span>
  );
}
