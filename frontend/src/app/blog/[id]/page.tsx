'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { HtmlContentBoundary } from '../../components/HtmlContentBoundary';

interface Article {
  id: string;
  keyword: string;
  title: string;
  content: string;
  tone: string;
  featuredImage: string | null;
  googleRank: number | null;
  updatedAt: string;
}

export default function BlogPostDetail() {
  const params = useParams();
  const id = params?.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchArticle = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/published-articles?includeDrafts=true');
        const data = await res.json();
        
        if (data.success) {
          let found = null;
          if (id === 'temp_preview') {
            // Fallback for simulation mode: Get the absolute newest article
            found = data.articles[0];
          } else {
            found = data.articles.find((x: Article) => x.id === id);
          }
          
          if (found) {
            setArticle(found);
          } else {
            setError('Article not found.');
          }
        } else {
          setError('Failed to load blog database.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Network error.');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', fontFamily: 'sans-serif' }}>
        <h3>Loading dynamic SEO blog page...</h3>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a', fontFamily: 'sans-serif', gap: '1rem' }}>
        <h2>⚠️ {error || 'Article not found.'}</h2>
        <Link href="/" style={{ color: '#6366f1', fontWeight: 'bold' }}>Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '3rem 1.5rem', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      
      {/* Dynamic Header Image */}
      <div style={{ maxWidth: '850px', margin: '0 auto 2rem' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#6366f1', fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
          ← Back to SEO Control Center
        </Link>

        {article.featuredImage && (
          <div style={{ width: '100%', height: '350px', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)', marginBottom: '2.5rem' }}>
            <img 
              src={article.featuredImage} 
              alt={article.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.25, marginBottom: '1rem' }}>
          {article.title}
        </h1>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
          <span>Targeted Keyword: <strong style={{ color: '#0f172a' }}>{article.keyword}</strong></span>
          <span>•</span>
          <span>Tone: <strong style={{ color: '#0f172a', textTransform: 'capitalize' }}>{article.tone}</strong></span>
          <span>•</span>
          <span>Rank: <strong style={{ color: article.googleRank && article.googleRank <= 3 ? '#10b981' : '#f59e0b' }}>#{article.googleRank || 'N/A'}</strong></span>
        </div>

        {/* Rendered HTML content — ErrorBoundary catches browser extension / HMR DOM crashes */}
        <HtmlContentBoundary
          content={article.content}
          className="article-preview-content"
          style={{ background: '#ffffff', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 30px rgba(0,0,0,0.01)' }}
        />
      </div>
    </div>
  );
}
