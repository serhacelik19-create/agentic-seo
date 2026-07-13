'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Domain {
  id: string;
  name: string;
  domainUrl: string;
  brandTone: string;
}

interface Article {
  id: string;
  keyword: string;
  title: string;
  content: string;
  tone: string;
  status: 'draft' | 'published';
  publishedUrl?: string;
  googleRank?: number | null;
  proposedContent?: string | null;
  proposedSeoScore?: number | null;
  hasPendingRecovery?: boolean;
  lastCheckedAt?: string | null;
  seoScore?: number;
  domain?: Domain | null;
  domainId?: string | null;
}

interface ClusterStrategy {
  pillar: string;
  support1: string;
  support2: string;
  explanation: string;
}

export default function DashboardPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingRankId, setUpdatingRankId] = useState<string | null>(null);

  // Premium modern toast notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const fetchData = async () => {
    try {
      const articlesRes = await fetch('http://localhost:5001/api/published-articles?includeDrafts=true');
      const articlesData = await articlesRes.json();
      if (articlesData.success) {
        setArticles(articlesData.articles);
      }
      
      const domainsRes = await fetch('http://localhost:5001/api/domains');
      const domainsData = await domainsRes.json();
      if (Array.isArray(domainsData)) {
        setDomains(domainsData);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateRank = async (id: string) => {
    setUpdatingRankId(id);
    try {
      const res = await fetch('http://localhost:5001/api/article-rank/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh articles
        const articlesRes = await fetch('http://localhost:5001/api/published-articles?includeDrafts=true');
        const articlesData = await articlesRes.json();
        if (articlesData.success) {
          setArticles(articlesData.articles);
        }
      } else {
        showNotification('Failed to update rank: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error connecting to backend.', 'error');
    } finally {
      setUpdatingRankId(null);
    }
  };

  const handleCopy = (content: string) => {
    // Strip HTML for simple copying if needed, or copy raw HTML
    navigator.clipboard.writeText(content);
    showNotification('Article content successfully copied to clipboard!', 'success');
  };

  const sentinelAbortRef = React.useRef<AbortController | null>(null);
  const [runningSentinel, setRunningSentinel] = useState(false);
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);

  const handleCancelSentinel = () => {
    if (sentinelAbortRef.current) {
      sentinelAbortRef.current.abort();
      setRunningSentinel(false);
    }
  };

  const handleRunSentinel = async () => {
    setRunningSentinel(true);
    const controller = new AbortController();
    sentinelAbortRef.current = controller;

    try {
      const res = await fetch('http://localhost:5001/api/autopilot/sentinel', {
        method: 'POST',
        signal: controller.signal
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'Autonomous Sentinel Scan Completed successfully!', 'success');
        fetchData(); // Refresh data
      } else {
        showNotification('Sentinel check failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        showNotification('Autonomous Sentinel scan successfully canceled by user.', 'info');
      } else {
        console.error(err);
        showNotification('Backend connection error or sentinel scan timed out.', 'error');
      }
    } finally {
      setRunningSentinel(false);
      sentinelAbortRef.current = null;
    }
  };

  const handleApproveRecovery = async (articleId: string, approve: boolean) => {
    setProcessingApprovalId(articleId);
    try {
      const res = await fetch('http://localhost:5001/api/autopilot/approve-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, approve })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || (approve ? 'SEO recovery approved and article successfully updated!' : 'Recovery recommendation dismissed.'), approve ? 'success' : 'info');
        fetchData(); // Refresh
      } else {
        showNotification('Operation failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Backend connection error.', 'error');
    } finally {
      setProcessingApprovalId(null);
    }
  };

  // Competitor Sitemap Watcher & Counter-Offensive States
  const [competitorDomain, setCompetitorDomain] = useState('');
  const [scanningCompetitor, setScanningCompetitor] = useState(false);
  const [clusterStrategy, setClusterStrategy] = useState<ClusterStrategy | null>(null);
  const [enqueuingCluster, setEnqueuingCluster] = useState(false);

  const handleScanCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!competitorDomain.trim()) return;
    setScanningCompetitor(true);
    setClusterStrategy(null);
    try {
      const res = await fetch('http://localhost:5001/api/competitor/sitemap-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorDomain })
      });
      const data = await res.json();
      if (data.success) {
        setClusterStrategy(data.strategy);
      } else {
        showNotification('Competitor scan failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error connecting to backend competitor manager.', 'error');
    } finally {
      setScanningCompetitor(false);
    }
  };

  const handleApproveCluster = async () => {
    if (!clusterStrategy) return;
    setEnqueuingCluster(true);
    try {
      const res = await fetch('http://localhost:5001/api/competitor/approve-cluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar: clusterStrategy.pillar,
          support1: clusterStrategy.support1,
          support2: clusterStrategy.support2
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Counter-Offensive Plan Approved! ${data.message}`, 'success');
        setClusterStrategy(null);
        setCompetitorDomain('');
      } else {
        showNotification('Enqueue failed: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error(err);
      showNotification('Error enqueuing topics.', 'error');
    } finally {
      setEnqueuingCluster(false);
    }
  };

  // Filter Articles
  const filteredArticles = articles.filter(art => {
    const matchesSearch = 
      art.keyword.toLowerCase().includes(search.toLowerCase()) || 
      (art.title && art.title.toLowerCase().includes(search.toLowerCase()));
      
    const matchesStatus = 
      statusFilter === 'all' || art.status === statusFilter;
      
    const matchesDomain = 
      domainFilter === 'all' || art.domainId === domainFilter;
      
    return matchesSearch && matchesStatus && matchesDomain;
  });

  // Calculate Metrics
  const totalArticles = articles.length;
  const publishedCount = articles.filter(a => a.status === 'published').length;
  const avgSeoScore = articles.length > 0 ? Math.round(articles.reduce((acc, a) => acc + (a.seoScore || 0), 0) / articles.length) : 0;

  return (
    <div style={{ maxWidth: '1200px', margin: '3.5rem auto', padding: '0 2.5rem' }}>
      
      {/* Premium Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ 
            width: '52px', 
            height: '52px', 
            borderRadius: '16px', 
            background: 'var(--primary-glow)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            border: '1px solid rgba(99, 102, 241, 0.15)',
            color: 'var(--primary)'
          }}>
            <svg style={{ width: '28px', height: '28px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Content Library & Analytics
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Review, optimize, and track published SEO assets and search performance indicators.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={handleRunSentinel}
            disabled={runningSentinel}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, var(--accent), hsl(325, 95%, 40%))',
              boxShadow: '0 4px 14px -4px var(--accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 700
            }}
          >
            {runningSentinel ? (
              <>
                <svg className="spinner-mini" style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                </svg>
                <span>Running Sentinel Scan...</span>
              </>
            ) : (
              <>
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Start Autonomous Sentinel Scan</span>
              </>
            )}
          </button>
          
          {runningSentinel && (
            <button 
              onClick={handleCancelSentinel}
              className="btn btn-secondary"
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--error)',
                background: 'rgba(239, 68, 68, 0.05)',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        
        {/* Total Articles */}
        <div className="glass-panel" style={{ 
          padding: '1.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1.25rem',
          position: 'relative'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'var(--primary-glow)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--primary)',
            border: '1px solid rgba(99, 102, 241, 0.12)'
          }}>
            <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Articles</h3>
            <p style={{ margin: '0.1rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalArticles}</p>
          </div>
        </div>

        {/* Published */}
        <div className="glass-panel" style={{ 
          padding: '1.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1.25rem',
          position: 'relative'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'var(--secondary-glow)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--secondary)',
            border: '1px solid rgba(13, 148, 136, 0.12)'
          }}>
            <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Published</h3>
            <p style={{ margin: '0.1rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{publishedCount}</p>
          </div>
        </div>

        {/* Avg SEO Score */}
        <div className="glass-panel" style={{ 
          padding: '1.75rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1.25rem',
          position: 'relative'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'var(--accent-glow)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent)',
            border: '1px solid rgba(219, 39, 119, 0.12)'
          }}>
            <svg style={{ width: '22px', height: '22px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg SEO Score</h3>
            <p style={{ margin: '0.1rem 0 0 0', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{avgSeoScore}/100</p>
          </div>
        </div>

      </div>

      {/* Advanced Filter Bar Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        
        {/* Search */}
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Search Articles</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by keyword or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <svg style={{ position: 'absolute', left: '0.95rem', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-muted)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Status</label>
          <select 
            className="form-input" 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ appearance: 'none', background: '#ffffff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center / 12px' }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Domain Filter */}
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Domain</label>
          <select 
            className="form-input" 
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            style={{ appearance: 'none', background: '#ffffff url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E") no-repeat right 0.75rem center / 12px' }}
          >
            <option value="all">All Domains</option>
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* 🚨 Competitor Sitemap Watch & Topic Cluster Counter-Offensive Panel */}
      <section className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg style={{ width: '20px', height: '20px', color: 'var(--accent)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          🚨 Competitor Watcher & Autonomous Counter-Offensive
        </h2>
        <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Scrape competitor sitemaps/RSS to track their new content and instantly plan a Counter-Offensive Topic Cluster using AI.
        </p>

        <form onSubmit={handleScanCompetitor} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Competitor website address (e.g. competitor.com)..."
              value={competitorDomain}
              onChange={e => setCompetitorDomain(e.target.value)}
              disabled={scanningCompetitor}
            />
          </div>
          <button 
            type="submit"
            disabled={scanningCompetitor || !competitorDomain.trim()}
            className="btn btn-primary"
            style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderColor: 'transparent',
              padding: '0.85rem 1.5rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 4px 12px -4px var(--primary)'
            }}
          >
            {scanningCompetitor ? 'Scanning Sitemap...' : 'Scan New Topics & Plan Strategy'}
          </button>
        </form>

        {clusterStrategy && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            borderRadius: '16px',
            background: 'rgba(99, 102, 241, 0.02)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                🎯 AI Counter-Offensive Plan (Topic Cluster Strategy)
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                {clusterStrategy.explanation}
              </p>
            </div>

            {/* Visual Topic Cluster Map */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              margin: '0.5rem 0'
            }}>
              {/* Pillar Post Card */}
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: '#ffffff',
                border: '2px solid var(--primary)',
                boxShadow: '0 4px 10px rgba(99,102,241,0.04)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-glow)', padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '0.5rem' }}>
                  Pillar Content (Core Guide)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{clusterStrategy.pillar}</p>
              </div>

              {/* Support Post 1 Card */}
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px dashed var(--border)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--secondary)', background: 'var(--secondary-glow)', padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '0.5rem' }}>
                  Support Content (Semantic Support)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{clusterStrategy.support1}</p>
              </div>

              {/* Support Post 2 Card */}
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px dashed var(--border)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '0.15rem 0.45rem', borderRadius: '4px', textTransform: 'uppercase', display: 'inline-block', marginBottom: '0.5rem' }}>
                  Technical Edge (Technical Focus)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{clusterStrategy.support2}</p>
              </div>
            </div>

            <button 
              onClick={handleApproveCluster}
              disabled={enqueuingCluster}
              className="btn btn-primary"
              style={{
                alignSelf: 'flex-start',
                background: 'linear-gradient(135deg, var(--success), hsl(150, 95%, 28%))',
                borderColor: 'transparent',
                boxShadow: '0 4px 10px -4px var(--success)',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {enqueuingCluster ? 'Enqueuing...' : 'Approve Offensive & Add to Queue'}
            </button>
          </div>
        )}
      </section>

      {/* Content Library List */}
      <section className="glass-panel" style={{ padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg style={{ width: '18px', height: '18px', color: 'var(--primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <line x1="15" y1="3" x2="15" y2="21" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
          </svg>
          Articles Database
        </h2>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
            <svg className="spinner-mini" style={{ width: '32px', height: '32px', color: 'var(--primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading library index...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ 
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px dashed var(--border)',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.01)'
          }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', marginBottom: '1.25rem' }}>
              {articles.length === 0 ? "No articles generated in database yet." : "No articles found matching active filter parameters."}
            </p>
            {articles.length === 0 && (
              <Link href="/" className="btn btn-primary">
                <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Write Your First Article</span>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredArticles.map(a => (
              <div 
                key={a.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.5rem 1.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '1.5rem',
                  borderLeft: a.status === 'published' ? '4px solid var(--success)' : '4px solid var(--warning)'
                }}
              >
                {/* Information Segment */}
                <div style={{ flex: '3 1 400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 800, 
                      letterSpacing: '0.05em', 
                      background: a.status === 'published' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                      color: a.status === 'published' ? 'var(--success)' : 'var(--warning)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      textTransform: 'uppercase'
                    }}>
                      {a.status}
                    </span>
                    {a.domain ? (
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        background: 'var(--secondary-glow)', 
                        color: 'var(--secondary)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(13, 148, 136, 0.1)'
                      }}>
                        {a.domain.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No Domain
                      </span>
                    )}
                  </div>
                  
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.15rem', letterSpacing: '-0.01em' }}>
                    {a.title || `SEO Article for ${a.keyword}`}
                  </h3>
                  
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Target Keyword:</strong> {a.keyword}
                  </p>
                </div>

                {/* Metrics/Scores Segment */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: '1 1 250px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  
                  {/* SEO Score Gauge */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>SEO Score</span>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '50%', 
                      border: '3px solid var(--border)', 
                      borderTopColor: (a.seoScore || 0) >= 80 ? 'var(--success)' : (a.seoScore || 0) >= 50 ? 'var(--warning)' : 'var(--error)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      fontSize: '0.85rem', 
                      color: 'var(--text-primary)' 
                    }}>
                      {a.seoScore || 0}
                    </div>
                  </div>

                  {/* Google Rank Pill */}
                  <div style={{ textAlign: 'center', minWidth: '90px' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>Google Rank</span>
                    {a.googleRank ? (
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800, 
                        fontSize: '1rem',
                        color: a.googleRank <= 10 ? 'var(--success)' : 'var(--primary)',
                        background: a.googleRank <= 10 ? 'rgba(16, 185, 129, 0.08)' : 'var(--primary-glow)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '10px',
                        border: a.googleRank <= 10 ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(99, 102, 241, 0.15)'
                      }}>
                        #{a.googleRank}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Unranked</span>
                    )}
                  </div>

                </div>

                {/* Actions Button Block */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px', justifyContent: 'flex-end' }}>
                  
                  {/* Copy Button */}
                  <button 
                    onClick={() => handleCopy(a.content)}
                    className="btn btn-secondary"
                    style={{ padding: '0.55rem', borderRadius: '10px' }}
                    title="Copy raw content"
                  >
                    <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>

                  {/* Rank Checker */}
                  {a.status === 'published' && a.domain && (
                    <button 
                      onClick={() => handleUpdateRank(a.id)}
                      disabled={updatingRankId === a.id}
                      className="btn btn-primary"
                      style={{ 
                        padding: '0.55rem 1rem', 
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        background: 'linear-gradient(135deg, var(--secondary), hsl(190, 95%, 32%))',
                        boxShadow: '0 4px 14px -4px var(--secondary)'
                      }}
                    >
                      {updatingRankId === a.id ? (
                        <>
                          <svg className="spinner-mini" style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="2" x2="12" y2="6" />
                            <line x1="12" y1="18" x2="12" y2="22" />
                            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                            <line x1="2" y1="12" x2="6" y2="12" />
                            <line x1="18" y1="12" x2="22" y2="12" />
                            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                          </svg>
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          <span>Check Rank</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* View Button */}
                  {a.publishedUrl && (
                    <Link 
                      href={a.publishedUrl.startsWith('/') ? `http://localhost:3000${a.publishedUrl}` : a.publishedUrl} 
                      target="_blank"
                      className="btn btn-secondary"
                      style={{ padding: '0.55rem 1rem', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <span>View</span>
                      <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </Link>
                  )}

                </div>

                {a.hasPendingRecovery && (
                  <div style={{
                    width: '100%',
                    marginTop: '1.25rem',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'rgba(245, 158, 11, 0.05)',
                    border: '1px dashed rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(35, 92%, 35%)', fontWeight: 700, fontSize: '0.9rem' }}>
                      <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span>Autonomous Sentinel Alert: Search Rank Drop Detected!</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                      Through Google Search Console tracking, your rank for keyword <strong>"{a.keyword}"</strong> dropped to <strong>#{a.googleRank || 'Unranked'}</strong>. Our agent re-analyzed competitors and crafted a higher semantic value draft (Proposed Score: <strong>{a.proposedSeoScore}/100</strong>).
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button 
                        onClick={() => handleApproveRecovery(a.id, true)}
                        disabled={processingApprovalId === a.id}
                        className="btn btn-primary"
                        style={{
                          padding: '0.45rem 1rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, var(--success), hsl(150, 95%, 28%))',
                          borderColor: 'transparent',
                          boxShadow: '0 4px 10px -4px var(--success)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer'
                        }}
                      >
                        {processingApprovalId === a.id ? (
                          <>
                            <svg className="spinner-mini" style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                            </svg>
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Approve & Publish Recovery</span>
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => handleApproveRecovery(a.id, false)}
                        disabled={processingApprovalId === a.id}
                        className="btn btn-secondary"
                        style={{
                          padding: '0.45rem 1rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Premium modern non-blocking notification toast */}
      {notification && (
        <div 
          className="toast-slide-in"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: notification.type === 'success' ? '#10b981' : notification.type === 'error' ? '#ef4444' : 'var(--primary)',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.15)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <span>{notification.type === 'success' ? '✓' : notification.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              marginLeft: '0.5rem',
              fontWeight: 800,
              fontSize: '1rem'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
