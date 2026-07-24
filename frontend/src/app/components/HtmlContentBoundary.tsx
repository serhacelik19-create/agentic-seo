'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  highlightKeyword?: string | null;
}

/**
 * HtmlContentBoundary — Imperative HTML renderer that prevents
 * React DOM reconciliation and hydration crashes completely,
 * while safely sanitizing HTML content using DOMPurify on the client.
 */
export function HtmlContentBoundary({ content, className, style, highlightKeyword }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      let displayContent = content || '';
      if (highlightKeyword && highlightKeyword.trim().length > 0) {
        // Escape regex characters safely
        const escaped = highlightKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        // Wrap with a highlighted span
        displayContent = displayContent.replace(
          regex,
          `<mark class="sem-highlight" style="background-color: rgba(251, 191, 36, 0.45); color: inherit; padding: 0.1rem 0.2rem; border-radius: 4px; border-bottom: 2px solid #d97706; transition: all 0.2s;">$1</mark>`
        );
      }

      // Dynamic import client-side DOMPurify to avoid SSG/prerender jsdom bundling
      import('dompurify').then((DOMPurify) => {
        const sanitized = DOMPurify.default.sanitize(displayContent, {
          ADD_ATTR: ['target', 'rel', 'style', 'class'],
        });
        if (containerRef.current) {
          containerRef.current.innerHTML = sanitized;
        }
      });
    }
  }, [content, highlightKeyword]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
    />
  );
}
