"use client";

import { useState } from "react";
import { iniciais } from "@/lib/format";

/** Official photo with an initials fallback (photo hosts are slow or missing for some members). */
export function Avatar({ src, nome, size = 56, className = "" }: { src?: string; nome: string; size?: number; className?: string }) {
  const [erro, setErro] = useState(false);
  const style = { width: size, height: Math.round(size * 1.25) };
  if (!src || erro) {
    return (
      <span
        aria-hidden
        style={style}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-surface-2 font-display text-ink-3 ${className}`}
      >
        <span style={{ fontSize: size * 0.34 }} className="font-semibold">
          {iniciais(nome)}
        </span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- official photos are served by government hosts as-is
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setErro(true)}
      style={style}
      className={`shrink-0 rounded-lg bg-surface-2 object-cover object-top ${className}`}
    />
  );
}
