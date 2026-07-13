'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  highlightKeyword?: string | null;
}

/**
 * HtmlContentBoundary — Imperative HTML renderer that prevents
 * React DOM reconciliation and hydration crashes completely.
 *
 * It renders an empty container during SSR / initial hydration, and then
 * updates innerHTML via a ref on the client. This bypasses React's virtual
 * DOM comparison tree entirely, making it 100% immune to:
 *   - Browser extensions (Grammarly, Google Translate, etc.)
 *   - React hydration mismatches
 *   - Next.js Fast Refresh DOM inconsistencies
 */
export function HtmlContentBoundary({ content, className, style, highlightKeyword }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && containerRef.current) {
      let displayContent = content || '';
      if (highlightKeyword && highlightKeyword.trim().length > 0) {
        // Escape regex characters safely
        const escaped = highlightKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        // Wrap with a highlighted span
        displayContent = displayContent.replace(regex, `<mark class="sem-highlight" style="background-color: rgba(251, 191, 36, 0.45); color: inherit; padding: 0.1rem 0.2rem; border-radius: 4px; border-bottom: 2px solid #d97706; transition: all 0.2s;">$1</mark>`);
      }
      containerRef.current.innerHTML = displayContent;
    }
  }, [content, mounted, highlightKeyword]);

  // Safe SSR placeholder to prevent hydration mismatch
  if (!mounted) {
    return <div className={className} style={style} />;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    />
  );
}
