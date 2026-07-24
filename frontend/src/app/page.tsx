'use client';

import React, { useState } from 'react';
import { HtmlContentBoundary } from './components/HtmlContentBoundary';
import { getApiUrl, getEventSourceUrl, getAuthHeaders } from '@/lib/api';

// Type Definitions
interface Domain {
  id: string;
  name: string;
  domainUrl: string;
  brandTone: string;
}

interface AutopilotKeyword {
  id: string;
  keyword: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface CompetitorHeader {
  tag: string;
  text: string;
}

interface Competitor {
  title: string;
  url: string;
  headers: CompetitorHeader[];
  bodyExcerpt: string;
}

interface OutlineHeading {
  tag: 'h2' | 'h3';
  text: string;
  keywords: string[];
}

interface Outline {
  suggestedTitle: string;
  metaDescription: string;
  headings: OutlineHeading[];
  suggestedWordCount: number;
}

interface AutopilotLog {
  id: string;
  keyword: string;
  agentName: string;
  step: number;
  message: string;
  createdAt: string;
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
}

interface CustomSelectProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { readonly value: T; readonly label: string }[];
  onChange: (val: T) => void;
  disabled?: boolean;
}

// Reusable custom dropdown menu (Stripe-styled) with dynamic stacking context
function CustomSelect<T extends string | number>({ label, value, options, onChange, disabled }: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 5 }}
      onMouseLeave={() => setIsOpen(false)}
    >
      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 700 }}>
        {label}
      </label>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="form-input"
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: '#ffffff',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border)',
          boxShadow: isOpen ? '0 0 0 4px var(--primary-glow)' : 'none',
          padding: '0.95rem 1.1rem',
          userSelect: 'none'
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedOption?.label}</span>
        <span style={{ 
          fontSize: '0.65rem', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.2s ease',
          color: 'var(--text-secondary)'
        }}>▼</span>
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '105%',
          left: 0,
          width: '100%',
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
          zIndex: 10000,
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          {options.map(opt => (
            <div 
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: opt.value === value ? 'var(--primary-glow)' : 'transparent',
                color: opt.value === value ? 'var(--primary)' : 'var(--text-primary)',
                fontWeight: opt.value === value ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <span style={{ fontWeight: 'bold' }}>✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Configurable Constants (Fully English)
const sizeOptions = [
  { value: 'short', label: 'Short (500 - 800 Words)' },
  { value: 'balanced', label: 'Balanced (1200 - 1500 Words)' },
  { value: 'comprehensive', label: 'Pillar Content (2000 - 2500+ Words)' }
] as const;

const toneOptions = [
  { value: 'professional', label: 'Professional / Corporate' },
  { value: 'casual', label: 'Casual / Engaging Blog' },
  { value: 'academic', label: 'Educational / Academic' },
  { value: 'sales', label: 'Persuasive / Sales Focused' }
] as const;

const limitOptions = [
  { value: 1, label: '1 Competitor (Fast)' },
  { value: 3, label: '3 Competitors (Balanced)' },
  { value: 5, label: '5 Competitors (Comprehensive)' }
] as const;

const platformOptions = [
  { value: 'Simulation', label: 'Simulated Webhook (Recommended)' },
  { value: 'WordPress', label: 'WordPress REST API' },
  { value: 'Webflow', label: 'Webflow CMS API' }
] as const;

export default function Dashboard() {
  const progressEventSourceRef = React.useRef<EventSource | null>(null);

  // Local States
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(3);
  const [size, setSize] = useState<'short' | 'balanced' | 'comprehensive'>('balanced');
  const [tone, setTone] = useState<'professional' | 'casual' | 'academic' | 'sales'>('professional');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Premium non-blocking toast notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // Safe fetch utility with timeout boundary support
  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 10000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const headers = getAuthHeaders(options.headers as Record<string, string> || {});
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err: unknown) {
      clearTimeout(id);
      throw err;
    }
  };

  // Real-time Progress Tracking States
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // Autopilot Queue States
  const [autopilotKeywords, setAutopilotKeywords] = useState<AutopilotKeyword[]>([]);
  const [newAutopilotKeyword, setNewAutopilotKeyword] = useState('');
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Autopilot Log States
  const [activeLogKeyword, setActiveLogKeyword] = useState<string | null>(null);
  const [keywordLogs, setKeywordLogs] = useState<AutopilotLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadKeywordLogs = async (kw: string) => {
    setActiveLogKeyword(kw);
    setLoadingLogs(true);
    try {
      const res = await fetch(getApiUrl(`/api/autopilot/logs/${encodeURIComponent(kw)}`));
      const data = await res.json();
      if (data.success && data.logs) {
        setKeywordLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    }
    setLoadingLogs(false);
  };

  // Steps & Statuses
  const [currentStep, setCurrentStep] = useState(0); // 0: Idle, 1: Scraping, 2: Analysis/Outline, 3: Generation, 4: Publishing
  const [stepStatuses, setStepStatuses] = useState<('pending' | 'running' | 'completed' | 'failed')[]>([
    'pending', 'pending', 'pending', 'pending'
  ]);

  // Backend Payload Values
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [articleContent, setArticleContent] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{ success: boolean; platform: string; url?: string; message: string; article?: Article } | null>(null);

  // Active Layout Toggles
  const [isEditingOutline, setIsEditingOutline] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'WordPress' | 'Webflow' | 'Simulation'>('Simulation');
  const [activeTab, setActiveTab] = useState<'preview' | 'html'>('preview');
  const [copied, setCopied] = useState(false);

  // Premium UX UI States
  const [isSeoPanelOpen, setIsSeoPanelOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hoveredKeyword, setHoveredKeyword] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // GEO Analysis States
  const [geoScore, setGeoScore] = useState<number | null>(null);
  const [geoRecs, setGeoRecs] = useState<string[]>([]);
  const [geoEntities, setGeoEntities] = useState<string[]>([]);
  const [geoPotential, setGeoPotential] = useState<string | null>(null);

  const runGEOAnalysis = async (contentStr: string) => {
    try {
      const res = await fetch(getApiUrl('/api/geo/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, content: contentStr })
      });
      const data = await res.json();
      if (data.success) {
        setGeoScore(data.score);
        setGeoRecs(data.recommendations || []);
        setGeoEntities(data.entitiesUsed || []);
        setGeoPotential(data.citationPotential || 'Medium');
      }
    } catch (err) {
      console.error('GEO analysis error:', err);
    }
  };

  // Multi-Agent Savaş Odası (War Room) States
  const [agentLogs, setAgentLogs] = useState<{ id: string; agent: string; message: string; timestamp: Date }[]>([]);

  // AI Pipeline Step Metadata
  const steps = [
    { title: 'Google SERP Scraping', desc: 'Competitor pages scraped deeply via Puppeteer' },
    { title: 'Competitor Semantic Analysis', desc: 'Optimal SEO structures designed via Artificial Intelligence' },
    { title: 'Autonomous Article Writing', desc: 'Writing a comprehensive, organic long-form article' },
    { title: 'Automated CMS Publishing', desc: 'Uploading as a ready draft to your CMS platforms' }
  ];

  // Fetch autopilot queue
  const fetchAutopilotQueue = React.useCallback(async () => {
    try {
      const res = await fetchWithTimeout(getApiUrl('/api/autopilot/keywords'), {}, 10000);
      const data = await res.json();
      if (data.success && data.keywords) {
        setAutopilotKeywords(data.keywords);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch queue:', err);
    }
  }, []);

  const startProgressTracking = (keywordTarget: string) => {
    setKeyword(keywordTarget); // Immediately update keyword focus in UI!
    setProgressPercentage(0);
    setProgressMessage('Connecting to real-time updates...');
    
    // Close existing event source if any
    if (progressEventSourceRef.current) {
      progressEventSourceRef.current.close();
    }
    
    const eventSource = new EventSource(getEventSourceUrl('/api/progress'));
    progressEventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.keyword) {
          // Dynamically track the active keyword being processed by the backend
          setKeyword(data.keyword);
          setProgressPercentage(data.percentage);
          setProgressMessage(data.message);

          // Accumulate agent dialog logs
          if (data.agentName && data.agentMessage) {
            setAgentLogs(prev => {
              const exists = prev.some(log => log.message === data.agentMessage);
              if (exists) return prev;
              return [...prev, {
                id: Math.random().toString(),
                agent: data.agentName,
                message: data.agentMessage,
                timestamp: new Date()
              }];
            });
          }
          
          // Dynamically map SSE step to interactive steps
          if (data.percentage >= 95) {
            setCurrentStep(4);
            setStepStatuses(['completed', 'completed', 'completed', 'running']);
          } else if (data.percentage >= 65) {
            setCurrentStep(3);
            setStepStatuses(['completed', 'completed', 'running', 'pending']);
          } else if (data.percentage >= 30) {
            setCurrentStep(2);
            setStepStatuses(['completed', 'running', 'pending', 'pending']);
          } else if (data.percentage >= 5) {
            setCurrentStep(1);
            setStepStatuses(['running', 'pending', 'pending', 'pending']);
          }
          
          if (data.status === 'completed') {
            setProgressPercentage(100);
            setProgressMessage('Completed successfully!');
            setStepStatuses(['completed', 'completed', 'completed', 'completed']);
          } else if (data.status === 'failed') {
            setProgressMessage(`Error: ${data.message}`);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      eventSource.close();
    };
  };

  React.useEffect(() => {
    let ignore = false;
    const init = async () => {
      try {
        const queueRes = await fetchWithTimeout(getApiUrl('/api/autopilot/keywords'), {}, 10000);
        const queueData = await queueRes.json();
        if (!ignore && queueData.success && queueData.keywords) {
          setAutopilotKeywords(queueData.keywords);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch queue:', err);
      }

      try {
        const domRes = await fetchWithTimeout(getApiUrl('/api/domains'), {}, 10000);
        const domData = await domRes.json();
        if (!ignore) {
          setDomains(domData);
          if (domData.length > 0) setSelectedDomain(domData[0].id);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch domains:', err);
      }
    };

    init();

    // Poll queue every 5 seconds
    const interval = setInterval(fetchAutopilotQueue, 5000);

    return () => {
      ignore = true;
      clearInterval(interval);
      if (progressEventSourceRef.current) {
        progressEventSourceRef.current.close();
      }
    };
  }, [fetchAutopilotQueue]);

  // Add keyword to autopilot queue
  const addAutopilotKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAutopilotKeyword.trim()) return;

    try {
      const res = await fetchWithTimeout(getApiUrl('/api/autopilot/keywords'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newAutopilotKeyword })
      }, 10000);
      const data = await res.json();
      if (data.success) {
        setNewAutopilotKeyword('');
        fetchAutopilotQueue();
        showNotification(`Keyword "${newAutopilotKeyword}" successfully added to Autopilot queue!`, 'success');
      } else {
        showNotification(data.error || "Failed to add keyword.", 'error');
      }
    } catch (e: unknown) {
      console.error("Failed to add autopilot keyword", e);
      showNotification("Network timeout or connection failure while adding keyword.", 'error');
    }
  };

  // Delete keyword from autopilot queue
  const deleteAutopilotKeyword = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent loading the article when clicking delete!
    if (!confirm("Are you sure you want to remove this keyword from the Autopilot queue?")) return;

    try {
      const res = await fetchWithTimeout(getApiUrl(`/api/autopilot/keywords/${id}`), {
        method: 'DELETE'
      }, 10000);
      const data = await res.json();
      if (data.success) {
        fetchAutopilotQueue();
        showNotification("Keyword successfully removed from Autopilot queue.", 'success');
      } else {
        showNotification(data.error || "Failed to delete keyword.", 'error');
      }
    } catch (e: unknown) {
      console.error("Failed to delete autopilot keyword", e);
      showNotification("Network timeout or connection failure while deleting keyword.", 'error');
    }
  };

  // Trigger Autopilot otonomously
  const triggerAutopilotQueue = async () => {
    setIsProcessingQueue(true);
    const pending = autopilotKeywords.find(k => k.status === 'pending');
    if (pending) {
      startProgressTracking(pending.keyword);
      // Immediately set its local status to 'processing' in UI so the user sees it instantly
      setAutopilotKeywords(prev => prev.map(k => k.id === pending.id ? { ...k, status: 'processing' } as AutopilotKeyword : k));
    }
    try {
      const res = await fetchWithTimeout(getApiUrl('/api/autopilot/trigger'), {
        method: 'POST'
      }, 45000); // 45 seconds timeout bounds for full queue analysis
      const data = await res.json();
      if (data.success) {
        showNotification(`Autopilot successfully finished processing keyword: "${data.keyword}"!`, 'success');
        fetchAutopilotQueue();
      } else {
        showNotification(data.error || "No pending autopilot keywords found.", 'error');
      }
    } catch (e: unknown) {
      console.error("Autopilot execution failed", e);
      if (e instanceof Error && e.name === 'AbortError') {
        showNotification("Autopilot request timed out. Processing is continuing in the background.", 'info');
      } else {
        showNotification("Network failure during Autopilot run.", 'error');
      }
    } finally {
      setIsProcessingQueue(false);
    }
  };

  // Trigger Geri Bildirim (Self-Reflection & Optimization)
  const triggerReflection = async (articleId: string) => {
    setLoading(true);
    try {
      const res = await fetchWithTimeout(getApiUrl('/api/autopilot/reflect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, currentRank: 8 }) // simulated low ranking #8
      }, 45000); // 45 seconds for complex reflection optimization rewrite
      const data = await res.json();
      if (data.success) {
        setArticleContent(data.article.content);
        showNotification("Reflection Agent active! Article has been autonomously rewritten to outrank competitors.", 'success');
      }
    } catch (e: unknown) {
      console.error("Reflection error", e);
      showNotification("Network timeout or connection failure during Reflection optimization.", 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Step Status Updater
  const updateStepStatus = (index: number, status: 'pending' | 'running' | 'completed' | 'failed') => {
    setStepStatuses(prev => {
      const next = [...prev];
      next[index] = status;
      return next;
    });
  };

  // Load completed autopilot article data into active editor dashboard
  const loadAutopilotArticle = async (kw: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(getApiUrl(`/api/article-data?keyword=${encodeURIComponent(kw)}`), {}, 15000);
      const data = await res.json();
      if (data.success) {
        setKeyword(kw);
        setCompetitors(data.competitors || []);
        setOutline(data.outline || null);
        setArticleContent(data.article?.content || '');
        if (data.article && data.article.content) {
          runGEOAnalysis(data.article.content);
        }
        if (data.article) {
          // Always show the generated article preview screen first so the user can see, read, and edit the content!
          setPublishResult(null);
          setStepStatuses(['completed', 'completed', 'completed', 'pending']);
          setCurrentStep(3);
        } else {
          setPublishResult(null);
          setStepStatuses(['completed', 'completed', 'pending', 'pending']);
          setCurrentStep(2);
        }
      } else {
        setError(data.error || 'Failed to fetch article details.');
      }
    } catch (e: unknown) {
      console.error(e);
      setError('Connection timeout or network error while fetching autopilot article data.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 1 & 2: Launch Autopilot (Scraping + Outline Analysis)
  const startAutopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setCompetitors([]);
    setOutline(null);
    setArticleContent(null);
    setPublishResult(null);
    setCurrentStep(1);
    
    // Reset statuses to defaults
    setStepStatuses(['running', 'pending', 'pending', 'pending']);
    startProgressTracking(keyword);

    try {
      const domainData = domains.find(d => d.id === selectedDomain);
      const response = await fetchWithTimeout(getApiUrl('/api/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keyword, 
          limit, 
          size, 
          tone,
          domainId: selectedDomain,
          brandTone: domainData ? domainData.brandTone : ''
        }),
      }, 45000); // 45 seconds timeout bound for crawler and gap analysis

      if (!response.ok) {
        throw new Error('Backend failed during SERP scraping or semantic analysis.');
      }

      updateStepStatus(0, 'completed');
      updateStepStatus(1, 'running');
      setCurrentStep(2);

      const data = await response.json();
      
      setCompetitors(data.competitors || []);
      setOutline(data.outline || null);
      
      updateStepStatus(1, 'completed');
      setLoading(false);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      updateStepStatus(0, 'failed');
      updateStepStatus(1, 'failed');
      setLoading(false);
    }
  };

  // STEP 3: Generate Article
  const generateArticle = async () => {
    if (!outline) return;

    setLoading(true);
    setError(null);
    setCurrentStep(3);
    setStepStatuses(['completed', 'completed', 'running', 'pending']);
    startProgressTracking(keyword);

    try {
      const response = await fetchWithTimeout(getApiUrl('/api/generate-article'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, outline, competitors, tone })
      }, 45000); // 45 seconds for writing comprehensive copy

      if (!response.ok) {
        throw new Error('Backend failed during autonomous article generation.');
      }

      const data = await response.json();
      setArticleContent(data.content);
      runGEOAnalysis(data.content);
      
      updateStepStatus(2, 'completed');
      setLoading(false);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate article.';
      setError(errorMessage);
      updateStepStatus(2, 'failed');
      setLoading(false);
    }
  };

  // STEP 4: Publish to Blog CMS
  const publishArticle = async () => {
    if (!articleContent || !outline) return;

    setLoading(true);
    setError(null);
    setCurrentStep(4);
    updateStepStatus(3, 'running');

    try {
      const res = await fetchWithTimeout(getApiUrl('/api/publish'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: outline?.suggestedTitle || keyword, 
          content: articleContent, 
          platform: selectedPlatform,
          domainId: selectedDomain
        }),
      }, 15000); // 15 seconds to publish to WordPress/Webflow webhook

      if (!res.ok) {
        throw new Error('Backend failed during CMS publishing integration.');
      }

      const data = await res.json();
      setPublishResult(data);
      
      if (data.success) {
        updateStepStatus(3, 'completed');
      } else {
        updateStepStatus(3, 'failed');
      }
      setLoading(false);
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish content.';
      setError(errorMessage);
      updateStepStatus(3, 'failed');
      setLoading(false);
    }
  };

  // --- Human-in-the-Loop Editors ---

  // Handle heading modification
  const handleHeadingTextChange = (index: number, newText: string) => {
    if (!outline) return;
    const nextHeadings = [...outline.headings];
    nextHeadings[index].text = newText;
    setOutline({ ...outline, headings: nextHeadings });
  };

  // Handle primary title modification
  const handleTitleChange = (newTitle: string) => {
    if (!outline) return;
    setOutline({ ...outline, suggestedTitle: newTitle });
  };

  // Add customized headings to outline
  const handleAddHeading = (tag: 'h2' | 'h3') => {
    if (!outline) return;
    const newHeading: OutlineHeading = {
      tag,
      text: tag === 'h2' ? 'New Subheading (H2)' : 'New Detailed Subheading (H3)',
      keywords: []
    };
    setOutline({
      ...outline,
      headings: [...outline.headings, newHeading]
    });
  };

  // Delete headings from outline
  const handleRemoveHeading = (index: number) => {
    if (!outline) return;
    const nextHeadings = outline.headings.filter((_, idx) => idx !== index);
    setOutline({
      ...outline,
      headings: nextHeadings
    });
  };

  // Reorder outline headings (Fluid Drag-and-Drop)
  const handleMoveHeading = (fromIndex: number | null, toIndex: number | null) => {
    if (fromIndex === null || toIndex === null || fromIndex === toIndex || !outline) return;
    const nextHeadings = [...outline.headings];
    const [removed] = nextHeadings.splice(fromIndex, 1);
    nextHeadings.splice(toIndex, 0, removed);
    setOutline({ ...outline, headings: nextHeadings });
    showNotification('Outline rearranged successfully', 'success');
  };

  // Toggle heading level between H2 and H3 when in editing state
  const toggleHeadingTag = (index: number) => {
    if (!outline || !isEditingOutline) return;
    const nextHeadings = [...outline.headings];
    nextHeadings[index].tag = nextHeadings[index].tag === 'h2' ? 'h3' : 'h2';
    setOutline({ ...outline, headings: nextHeadings });
  };

  // --- Utility Content Methods ---

  // Clipboard Copier
  const copyToClipboard = () => {
    if (!articleContent) return;
    navigator.clipboard.writeText(articleContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download local HTML file
  const downloadHtmlFile = () => {
    if (!articleContent || !outline) return;
    const element = document.createElement('a');
    const file = new Blob([articleContent], { type: 'text/html;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${(outline.suggestedTitle || 'article').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Unique LSI keywords gathered from the outline structure and user's primary search target
  const semanticKeywords = React.useMemo(() => {
    if (!outline) return [];
    const list = new Set<string>();
    if (keyword) list.add(keyword.toLowerCase().trim());
    (outline.headings || []).forEach(h => {
      if (h.keywords && Array.isArray(h.keywords)) {
        h.keywords.forEach(k => {
          if (k) list.add(k.toLowerCase().trim());
        });
      }
    });
    return Array.from(list);
  }, [outline, keyword]);

  // Real-time density checking for semantic/LSI keywords in written content
  const keywordCounts = React.useMemo(() => {
    if (!articleContent || semanticKeywords.length === 0) return {};
    const counts: Record<string, number> = {};
    const textContent = articleContent.toLowerCase();
    semanticKeywords.forEach(kw => {
      // Escape special characters to prevent regular expression compilation faults
      const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = textContent.match(regex);
      counts[kw] = matches ? matches.length : 0;
    });
    return counts;
  }, [articleContent, semanticKeywords]);

  // --- Real-time SEO Score Calculator (SurferSEO-styled) optimized with useMemo ---
  const seoReport = React.useMemo(() => {
    if (!outline) return { score: 0, items: [] as { text: string; passed: boolean; impact: string }[] };
    
    let currentScore = 0;
    const scoreItems = [];
    const keywordLower = (keyword || '').toLowerCase().trim();

    // 1. Keyword in H1 Title? (20 Points)
    const titleLower = (outline.suggestedTitle || '').toLowerCase();
    const hasKeywordInTitle = keywordLower ? titleLower.includes(keywordLower) : false;
    currentScore += hasKeywordInTitle ? 20 : 0;
    scoreItems.push({
      text: 'Target keyword is present in the main heading (H1).',
      passed: hasKeywordInTitle,
      impact: '20 Points'
    });

    // 2. Keyword in Meta Description? (15 Points)
    const metaLower = (outline.metaDescription || '').toLowerCase();
    const hasKeywordInMeta = keywordLower ? metaLower.includes(keywordLower) : false;
    currentScore += hasKeywordInMeta ? 15 : 0;
    scoreItems.push({
      text: 'Target keyword is present in the search meta description.',
      passed: hasKeywordInMeta,
      impact: '15 Points'
    });

    // 3. Keyword in alt headings? (15 Points)
    const headingsArr = outline.headings || [];
    const hasKeywordInHeadings = keywordLower ? headingsArr.some(h => (h.text || '').toLowerCase().includes(keywordLower)) : false;
    currentScore += hasKeywordInHeadings ? 15 : 0;
    scoreItems.push({
      text: 'Target keyword is present in at least one subheading (H2/H3).',
      passed: hasKeywordInHeadings,
      impact: '15 Points'
    });

    // 4. Content structure complexity? (15 Points)
    const hasEnoughHeadings = headingsArr.length >= 4;
    currentScore += hasEnoughHeadings ? 15 : 0;
    scoreItems.push({
      text: `Content hierarchy is sufficiently detailed (${headingsArr.length}/4+ headings).`,
      passed: hasEnoughHeadings,
      impact: '15 Points'
    });

    // 5. Word count & Technical schema checks (Requires article body written)
    if (articleContent) {
      const cleanText = articleContent.replace(/<[^>]*>/g, ' ');
      const actualWords = cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;

      const reachesWordTarget = actualWords >= (outline.suggestedWordCount * 0.8);
      currentScore += reachesWordTarget ? 20 : 0;
      scoreItems.push({
        text: `Target article length has been achieved (${actualWords}/${outline.suggestedWordCount} words).`,
        passed: reachesWordTarget,
        impact: '20 Points'
      });

      const hasFaqSchema = articleContent.includes('application/ld+json') && articleContent.includes('FAQPage');
      currentScore += hasFaqSchema ? 15 : 0;
      scoreItems.push({
        text: 'Technical FAQ JSON-LD Schema successfully embedded inside article markup.',
        passed: hasFaqSchema,
        impact: '15 Points'
      });
    } else {
      scoreItems.push({
        text: 'Target word count verification (Evaluated once article generation completes).',
        passed: false,
        impact: '20 Points'
      });
      scoreItems.push({
        text: 'Technical FAQ Schema check (Evaluated once article generation completes).',
        passed: false,
        impact: '15 Points'
      });
    }

    return { score: currentScore, items: scoreItems };
  }, [outline, keyword, articleContent]);

  // Reusable interactive circular progress indicator component
  const renderPremiumScoreGauge = () => {
    const score = seoReport.score;
    const radius = 20;
    const circumference = 2 * Math.PI * radius; // ~125.66
    const strokeDashoffset = circumference - (circumference * score) / 100;
    
    let color = 'var(--error)';
    let glowColor = 'rgba(239, 68, 68, 0.4)';
    if (score >= 80) {
      color = 'var(--success)';
      glowColor = 'rgba(16, 185, 129, 0.4)';
    } else if (score >= 50) {
      color = 'var(--warning)';
      glowColor = 'rgba(245, 158, 11, 0.4)';
    }

    return (
      <div 
        className="premium-gauge-wrapper"
        onClick={() => setIsSeoPanelOpen(true)}
        title="Click to view detailed SEO guidelines and optimization steps"
      >
        <div className="gauge-svg-container">
          <svg className="gauge-svg" viewBox="0 0 52 52">
            <circle className="gauge-bg-circle" cx="26" cy="26" r={radius} />
            <circle 
              className="gauge-progress-circle" 
              cx="26" 
              cy="26" 
              r={radius} 
              stroke={color}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div 
            className="gauge-core-sphere pulse"
            style={{ 
              background: `linear-gradient(135deg, #ffffff, rgba(255,255,255,0.9))`, 
              border: `1px solid ${color}`,
              color: color,
              '--pulse-color': glowColor
            } as React.CSSProperties}
          >
            {score}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            Live SEO Score <span style={{ animation: 'pulse 1.5s infinite', color: color }}>●</span>
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 650 }}>{score}/100 • Click to optimize</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '6rem', position: 'relative' }}>
      
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
              fontWeight: 'bold',
              marginLeft: '0.5rem',
              opacity: 0.8
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Background drifting glow orbs */}
      <div className="glow-orb glow-orb-primary"></div>
      <div className="glow-orb glow-orb-secondary"></div>

      {/* Top micro progress neon line */}
      <div className="progress-line-container">
        <div 
          className="progress-line-fill" 
          style={{ width: `${currentStep === 0 ? 0 : (currentStep / 4) * 100}%` }}
        ></div>
      </div>

      {/* Hero header section */}
      <header style={{ 
        textAlign: 'center', 
        padding: '4.5rem 1rem 3.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(255,255,255,0.005)'
      }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Agentic SEO & Content Autopilot
        </h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto', fontSize: '1.05rem', opacity: 0.95 }}>
          An autonomous SEO article generator that scrapes ranking competitor outlines on Google and authors fully optimized long-form articles using Artificial Intelligence.
        </p>
      </header>

      {/* Primary dashboard container */}
      <div className="dashboard-grid">

        {/* AI Agent real-time progress engine (Horizontal Stepper at the very top of Dashboard) */}
        <section className="glass-panel" style={{ 
          padding: '1.25rem 2rem', 
          width: '100%', 
          position: 'relative', 
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              ⚡ Real-Time Content Pipeline Status {keyword ? `for "${keyword}"` : ''}
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Active Step: {currentStep === 0 ? 'Idle' : `${currentStep} / 4`}
            </span>
          </div>

          {progressPercentage > 0 && (
            <div style={{ marginBottom: '1.25rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span>{progressMessage || 'Processing...'}</span>
                <span>{progressPercentage}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${progressPercentage}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                    borderRadius: '3px',
                    boxShadow: '0 0 8px var(--primary)',
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
                  }} 
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', gap: '0.75rem', position: 'relative', flexWrap: 'wrap' }}>
            {steps.map((step, idx) => {
              const isCompleted = stepStatuses[idx] === 'completed';
              const isActive = currentStep === idx + 1;
              const isFailed = stepStatuses[idx] === 'failed';

              let statusBg = 'rgba(148, 163, 184, 0.04)';
              let statusBorder = 'var(--border)';

              if (isActive) {
                statusBg = 'var(--primary-glow)';
                statusBorder = 'rgba(99, 102, 241, 0.3)';
              } else if (isCompleted) {
                statusBg = 'rgba(16, 185, 129, 0.05)';
                statusBorder = 'rgba(16, 185, 129, 0.2)';
              } else if (isFailed) {
                statusBg = 'rgba(239, 68, 68, 0.05)';
                statusBorder = 'rgba(239, 68, 68, 0.2)';
              }

              return (
                <React.Fragment key={idx}>
                  {/* Step Card */}
                  <div 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 1rem', 
                      borderRadius: '12px', 
                      background: statusBg,
                      border: `1px solid ${statusBorder}`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      flex: '1 1 200px',
                      minWidth: '200px',
                      boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.06)' : 'none',
                      transform: isActive ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%',
                      background: isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : isFailed ? 'var(--error)' : 'rgba(148, 163, 184, 0.1)',
                      color: isActive || isCompleted || isFailed ? '#ffffff' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      transition: 'all 0.3s ease',
                      flexShrink: 0
                    }}>
                      {isCompleted ? '✓' : isFailed ? '✗' : idx + 1}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ 
                        fontSize: '0.825rem', 
                        fontWeight: isActive || isCompleted ? 700 : 500, 
                        color: isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {step.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isActive ? 'Processing...' : isCompleted ? 'Done' : isFailed ? 'Error' : 'Waiting'}
                      </span>
                    </div>
                  </div>

                  {/* Stepper Connector (Line) */}
                  {idx < 3 && (
                    <div style={{ 
                      height: '2px', 
                      flex: '0 1 20px', 
                      background: isCompleted ? 'var(--success)' : 'var(--border)',
                      minWidth: '10px',
                      display: 'block'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Multi-Agent Savaş Odası Görselleştirici Panel (AI SEO War Room) */}
          {agentLogs.length > 0 && (() => {
            const activeAgentName = agentLogs[agentLogs.length - 1]?.agent || 'Orchestrator Agent';
            const agentsList = [
              { name: 'Orchestrator Agent', emoji: '👑', color: 'var(--primary)' },
              { name: 'Researcher Agent', emoji: '🔍', color: 'var(--secondary)' },
              { name: 'Strategist Agent', emoji: '🎯', color: 'hsl(35, 92%, 40%)' },
              { name: 'Writer Agent', emoji: '✍️', color: 'var(--success)' },
              { name: 'Creative Designer Agent', emoji: '🎨', color: 'var(--accent)' },
              { name: 'Technical SEO Auditor', emoji: '🛠️', color: 'var(--accent)' }
            ];

            return (
              <div style={{
                marginTop: '1.5rem',
                padding: '1.5rem 1.75rem',
                borderRadius: '20px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 4px 20px -8px rgba(99, 102, 241, 0.08)'
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span className="spinner-mini" style={{ width: '12px', height: '12px', display: 'inline-block', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  🤖 Multi-Agent SEO War Room (Canlı Ajan Akışı)
                </h3>

                {/* Visual Agent Grid (Option 3 - War Room Visualizer) */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 0.5rem',
                  borderBottom: '1px solid rgba(0,0,0,0.03)',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  background: 'rgba(99, 102, 241, 0.01)',
                  borderRadius: '16px',
                  border: '1px dashed var(--border)'
                }}>
                  {agentsList.map((ag) => {
                    const isActive = activeAgentName === ag.name;
                    return (
                      <div 
                        key={ag.name} 
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.5rem',
                          flex: '1 1 90px',
                          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          opacity: isActive ? 1 : 0.45,
                          transform: isActive ? 'scale(1.08)' : 'scale(1)'
                        }}
                      >
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: isActive ? ag.color : '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          border: isActive ? `2.5px solid #ffffff` : '1px solid var(--border)',
                          boxShadow: isActive ? `0 0 15px ${ag.color}` : 'none',
                          animation: isActive ? 'led-pulse 2s infinite' : 'none',
                          color: isActive ? '#ffffff' : 'inherit'
                        }}>
                          {ag.emoji}
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: isActive ? ag.color : 'var(--text-secondary)',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {ag.name.replace(' Agent', '')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  paddingRight: '0.5rem',
                  fontSize: '0.82rem'
                }}>
                {agentLogs.map((log) => {
                  let badgeColor = 'var(--primary)';
                  let badgeBg = 'var(--primary-glow)';
                  
                  if (log.agent === 'Researcher Agent') {
                    badgeColor = 'var(--secondary)';
                    badgeBg = 'var(--secondary-glow)';
                  } else if (log.agent === 'Writer Agent') {
                    badgeColor = 'var(--success)';
                    badgeBg = 'rgba(16,185,129,0.08)';
                  } else if (log.agent === 'Technical SEO Auditor') {
                    badgeColor = 'var(--accent)';
                    badgeBg = 'var(--accent-glow)';
                  } else if (log.agent === 'Strategist Agent') {
                    badgeColor = 'hsl(35, 92%, 40%)';
                    badgeBg = 'rgba(245, 158, 11, 0.08)';
                  }

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        color: badgeColor,
                        background: badgeBg,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap',
                        border: `1px solid rgba(0,0,0,0.02)`
                      }}>
                        {log.agent}
                      </span>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.45', flex: 1 }}>
                        {log.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        </section>

        {/* Horizontal Controls Container (Autopilot Settings + 24/7 Queue side by side) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%', position: 'relative', zIndex: 10 }}>
          
          {/* Autopilot Settings */}
          <section className="glass-panel" style={{ padding: '1.75rem', overflow: 'visible', position: 'relative', zIndex: 20 }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>🚀 Autopilot Settings</h2>
            <form onSubmit={startAutopilot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflow: 'visible' }}>
              <div style={{ overflow: 'visible' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 700 }}>
                  Target Keyword
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}
                  placeholder="e.g., Artificial intelligence in software development" 
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* Stack custom select grids horizontally */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', overflow: 'visible', position: 'relative', zIndex: 40 }}>
                <CustomSelect 
                  label="Target Domain"
                  value={selectedDomain}
                  options={domains.map(d => ({ label: d.name, value: d.id }))}
                  onChange={setSelectedDomain}
                  disabled={loading || domains.length === 0}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', overflow: 'visible', position: 'relative', zIndex: 30 }}>
                <CustomSelect 
                  label="Word Count"
                  value={size}
                  options={sizeOptions}
                  onChange={setSize}
                  disabled={loading}
                />
                <CustomSelect 
                  label="Tone of Voice"
                  value={tone}
                  options={toneOptions}
                  onChange={setTone}
                  disabled={loading}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem', alignItems: 'end', overflow: 'visible', position: 'relative', zIndex: 25 }}>
                <CustomSelect 
                  label="Competitor Limit"
                  value={limit}
                  options={limitOptions}
                  onChange={setLimit}
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ height: '3.1rem', justifyContent: 'center', width: '100%' }}
                  disabled={loading || !keyword.trim()}
                >
                  {loading && currentStep <= 2 ? 'Scraping...' : 'Launch'}
                </button>
              </div>
            </form>
          </section>

          {/* Autopilot Autonomous 24/7 Queue Dashboard */}
          <section className="glass-panel" style={{ padding: '1.75rem', position: 'relative', overflow: 'visible', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                ⏳ 24/7 Autopilot Queue
              </h2>
              {(() => {
                const isProcessing = isProcessingQueue || autopilotKeywords.some(k => k.status === 'processing');
                const hasKeywords = autopilotKeywords.length > 0;
                
                let label = 'Empty';
                let color = 'var(--text-secondary)';
                let bg = 'rgba(148, 163, 184, 0.08)';
                let border = '1px solid rgba(148, 163, 184, 0.15)';
                let dotColor = 'var(--text-muted)';
                let isPulse = false;

                if (isProcessing) {
                  label = 'Processing';
                  color = 'var(--success)';
                  bg = 'rgba(16, 185, 129, 0.08)';
                  border = '1px solid rgba(16, 185, 129, 0.15)';
                  dotColor = 'var(--success)';
                  isPulse = true;
                } else if (hasKeywords) {
                  label = 'Idle';
                  color = 'var(--warning)';
                  bg = 'rgba(245, 158, 11, 0.08)';
                  border = '1px solid rgba(245, 158, 11, 0.15)';
                  dotColor = 'var(--warning)';
                }

                return (
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: color, 
                    background: bg, 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '20px', 
                    border: border,
                    transition: 'all 0.3s ease'
                  }}>
                    <span 
                      className={isPulse ? "pulse-indicator" : ""} 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: dotColor, 
                        display: 'inline-block' 
                      }}
                    ></span>
                    {label}
                  </span>
                );
              })()}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', opacity: 0.8, marginBottom: '1.1rem' }}>
              Add target keywords for real-time background processing.
            </p>

            <form onSubmit={addAutopilotKeyword} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input 
                type="text"
                className="form-input"
                style={{ 
                  width: '100%',
                  padding: '0.75rem 4rem 0.75rem 1rem', 
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: '#ffffff',
                  transition: 'all 0.3s ease',
                  boxShadow: 'none'
                }}
                placeholder="Queue new keyword..."
                value={newAutopilotKeyword}
                onChange={(e) => setNewAutopilotKeyword(e.target.value)}
                disabled={isProcessingQueue}
              />
              <button 
                type="submit"
                style={{ 
                  position: 'absolute',
                  right: '0.35rem',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover, #6366f1))',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.95rem',
                  borderRadius: '9px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(99, 102, 241, 0.2)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '2.1rem'
                }}
                disabled={isProcessingQueue || !newAutopilotKeyword.trim()}
              >
                + Add
              </button>
            </form>

            <div style={{ maxHeight: '125px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem', marginBottom: '1rem' }}>
              {autopilotKeywords.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem 0', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                  Queue is currently empty.
                </div>
              ) : (
                autopilotKeywords.map(item => {
                  const isCompleted = item.status === 'completed';
                  const isProcessing = item.status === 'processing';
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (isCompleted) {
                          loadAutopilotArticle(item.keyword);
                        } else {
                          startProgressTracking(item.keyword);
                        }
                      }}
                      title={isCompleted ? "Click to load generated article into active Editor Dashboard" : "Click to focus and view real-time progress"}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'center', 
                        background: isCompleted ? 'rgba(99, 102, 241, 0.02)' : isProcessing ? 'rgba(245, 158, 11, 0.02)' : '#ffffff', 
                        padding: '0.65rem 0.85rem', 
                        borderRadius: '12px', 
                        border: isCompleted ? '1px solid rgba(99, 102, 241, 0.15)' : isProcessing ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid var(--border)', 
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        gap: isProcessing ? '0.4rem' : '0'
                      }}
                      className={isCompleted ? "premium-queue-item completed" : "premium-queue-item"}
                    >
                      {/* Left vertical status border accent */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3.5px',
                        background: isCompleted ? 'var(--success)' : isProcessing ? 'var(--warning)' : 'var(--text-muted)',
                        opacity: 0.85
                      }} />

                      {/* Main Item Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ 
                          fontWeight: 600, 
                          color: 'var(--text-primary)', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          maxWidth: '170px',
                          paddingLeft: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }} title={item.keyword}>
                          {isCompleted ? '📖' : isProcessing ? '⚙️' : '⏳'} {item.keyword}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', zIndex: 10 }}>
                          <span style={{ 
                            fontSize: '0.68rem', 
                            padding: '0.15rem 0.45rem', 
                            borderRadius: '20px', 
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            background: isCompleted ? 'rgba(16,185,129,0.08)' : isProcessing ? 'rgba(245,158,11,0.08)' : 'rgba(148,163,184,0.08)',
                            color: isCompleted ? 'var(--success)' : isProcessing ? 'var(--warning)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            {isProcessing && <span className="pulse-indicator-small" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }}></span>}
                            {item.status}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadKeywordLogs(item.keyword);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              padding: '0.2rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              opacity: 0.5,
                              marginRight: '0.25rem'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.5';
                              e.currentTarget.style.background = 'transparent';
                            }}
                            title="View execution log history"
                          >
                            📜
                          </button>

                          <button
                            onClick={(e) => deleteAutopilotKeyword(e, item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              padding: '0.2rem',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease',
                              opacity: 0.5
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.5';
                              e.currentTarget.style.background = 'transparent';
                            }}
                            title="Delete keyword from queue"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Card-Level Progress Section (visible when processing) */}
                      {isProcessing && progressPercentage > 0 && (
                        <div style={{ paddingLeft: '0.35rem', width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={progressMessage}>
                              {progressMessage || 'Processing queue item...'}
                            </span>
                            <span>{progressPercentage}%</span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(15, 23, 42, 0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div 
                              style={{ 
                                width: `${progressPercentage}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, var(--warning), var(--secondary))',
                                borderRadius: '2px',
                                transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)' 
                              }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {activeLogKeyword && (
              <div style={{
                marginTop: '1rem',
                padding: '1.25rem',
                borderRadius: '16px',
                background: 'rgba(99, 102, 241, 0.02)',
                border: '1px solid rgba(99, 102, 241, 0.12)',
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    📜 Otopilot Ajan Günlüğü: &quot;{activeLogKeyword}&quot;
                  </strong>
                  <button 
                    onClick={() => setActiveLogKeyword(null)} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: '1.15rem', 
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.2rem',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </div>
                {loadingLogs ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="spinner-mini" style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.1)', borderTopColor: 'var(--primary)', display: 'inline-block' }}></span>
                    Yapay zeka otopilot günlükleri yükleniyor...
                  </div>
                ) : keywordLogs.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Henüz kalıcı otopilot günlüğü bulunamadı.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {keywordLogs.map((log: AutopilotLog) => (
                      <div key={log.id} style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          🤖 {log.agentName} <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>(Adım {log.step})</span>
                        </span>
                        <span style={{ color: 'var(--text-secondary)', marginTop: '0.1rem', lineHeight: 1.4 }}>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            <button 
              type="button"
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                height: '2.8rem', 
                fontSize: '0.85rem', 
                background: 'linear-gradient(135deg, var(--secondary), var(--secondary-hover))', 
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.15)',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                transition: 'all 0.25s ease'
              }}
              onClick={triggerAutopilotQueue}
              disabled={isProcessingQueue || autopilotKeywords.filter(x => x.status === 'pending').length === 0}
            >
              {isProcessingQueue ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="spinner-mini" style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff', display: 'inline-block' }}></span>
                  Processing Queue...
                </div>
              ) : '⚡ Trigger Autopilot Run'}
            </button>
          </section>

        </div>

        {/* Right Content Panel: Outline, Previews, SEO Analysis (Now below the horizontal grid) */}
        <main className="glass-panel" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', width: '100%' }}>
          
          {/* General Error Banner */}
          {error && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid var(--error)', 
              color: 'var(--text-primary)', 
              padding: '1.25rem', 
              borderRadius: '12px', 
              marginBottom: '2rem',
              fontSize: '0.92rem'
            }}>
              ⚠️ <strong>System Alert:</strong> {error}
            </div>
          )}

          {/* Idle State: No Autopilot Launched yet */}
          <div style={{ 
            display: (currentStep === 0 && !loading) ? 'flex' : 'none',
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flex: 1, 
            textAlign: 'center',
            padding: '5rem 1rem'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🤖</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>Autopilot Ready</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.95rem', opacity: 0.9 }}>
              Enter a target keyword on the left panel and click &quot;Launch Autopilot&quot; to trigger the autonomous SEO workflow.
            </p>
          </div>

          {/* Scraping/Outline Processing Shimmer State */}
          <div style={{ display: (loading && currentStep <= 2) ? 'flex' : 'none', flexDirection: 'column', gap: '1.8rem', width: '100%', padding: '1rem' }}>
            <div className="shimmer" style={{ height: '36px', width: '45%', borderRadius: '8px' }}></div>
            <div className="shimmer" style={{ height: '140px', width: '100%', borderRadius: '16px' }}></div>
            <div className="shimmer" style={{ height: '44px', width: '100%', borderRadius: '10px' }}></div>
            <div className="shimmer" style={{ height: '44px', width: '100%', borderRadius: '10px' }}></div>
            <div className="shimmer" style={{ height: '44px', width: '100%', borderRadius: '10px' }}></div>
          </div>

          {/* STEP 2: Competitors outline mapping + Live SEO Score Scorer Panel (Human-in-the-loop) */}
          <div 
            style={{ 
              display: (outline && !articleContent && !loading) ? 'flex' : 'none', 
              flexDirection: 'column', 
              gap: '2.5rem',
              width: '100%'
            }}
          >
              
              {/* Live SEO Score Gauge (SurferSEO-styled) */}
              <div className="glass-panel" style={{ background: 'rgba(99, 102, 241, 0.01)', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '240px' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📈 Live SEO Score Analyzer
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Optimize structural criteria live to maximize rankings. Click the badge to view the full guideline!
                  </p>
                </div>
                {renderPremiumScoreGauge()}
              </div>

              {/* Scraped Competitors metadata */}
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--secondary)', letterSpacing: '-0.01em' }}>
                  🔍 Google Ranking Competitors Identified
                </h3>
                {competitors.length === 0 ? (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    padding: '1.25rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                  }}>
                    ℹ️ Competitor pages could not be scraped directly due to Google anti-bot checks. However, the AI has automatically bypassed SERP analysis and mapped out a targeted English outline.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {competitors.map((comp, cIdx) => (
                      <div key={cIdx} style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '12px', 
                        padding: '1.25rem' 
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{comp.title}</h4>
                          <a href={comp.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--secondary)', textDecoration: 'none', fontWeight: 600 }}>
                            Visit Site ↗
                          </a>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', opacity: 0.85 }}>
                          {comp.headers.slice(0, 5).map((h, hIdx) => (
                            <span key={hIdx} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              {h.tag.toUpperCase()}: {h.text.slice(0, 30)}...
                            </span>
                          ))}
                          {comp.headers.length > 5 && <span style={{ padding: '0.2rem 0.5rem' }}>+{comp.headers.length - 5} more headings</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI SEO suggested outline editor */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
                    📝 AI Suggested SEO Outline (Human-in-the-Loop)
                  </h3>
                  <button 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                    onClick={() => setIsEditingOutline(!isEditingOutline)}
                  >
                    {isEditingOutline ? 'Save Outline' : 'Edit Outline'}
                  </button>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(0,0,0,0.15)' }}>
                  
                  {/* CTR suggested title input */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Suggested Article Title (High-CTR)
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={outline?.suggestedTitle || ''}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      disabled={!isEditingOutline}
                      style={{ fontWeight: 'bold', fontSize: '1.05rem' }}
                    />
                  </div>

                  {/* Meta description input */}
                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Suggested Search Meta Description
                    </label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      value={outline?.metaDescription || ''}
                      onChange={(e) => setOutline(prev => prev ? { ...prev, metaDescription: e.target.value } : null)}
                      disabled={!isEditingOutline}
                      style={{ resize: 'none' }}
                    />
                  </div>

                  {/* Outline header structures */}
                  <div className="outline-editor-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Content Hierarchy (H2 & H3)
                      </label>
                      
                      {isEditingOutline && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', borderRadius: '6px' }}
                            onClick={() => handleAddHeading('h2')}
                          >
                            + Add H2
                          </button>
                          <button 
                            type="button"
                            className="btn btn-secondary" 
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', borderRadius: '6px' }}
                            onClick={() => handleAddHeading('h3')}
                          >
                            + Add H3
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {(outline?.headings || []).map((heading, idx) => (
                      <div 
                        key={idx} 
                        className={`outline-item draggable ${draggedIndex === idx ? 'dragging' : ''} ${dragOverIndex === idx ? 'drag-over' : ''}`}
                        draggable={isEditingOutline}
                        onDragStart={() => setDraggedIndex(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverIndex(idx);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDrop={() => handleMoveHeading(draggedIndex, dragOverIndex)}
                        style={{ 
                          marginLeft: heading.tag === 'h3' ? '1.8rem' : '0',
                          borderLeft: heading.tag === 'h3' ? '3px solid var(--secondary)' : '3px solid var(--primary)',
                          transition: 'margin-left 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                      >
                        {isEditingOutline && (
                          <div className="drag-handle" title="Drag to reorder headings">
                            ⋮⋮
                          </div>
                        )}
                        <span 
                          className={`outline-tag ${heading.tag}`}
                          style={{ cursor: isEditingOutline ? 'pointer' : 'default', transition: 'all 0.18s ease' }}
                          onClick={() => toggleHeadingTag(idx)}
                          title={isEditingOutline ? "Click to toggle H2/H3 level" : undefined}
                        >
                          {heading.tag.toUpperCase()}
                        </span>
                        <input 
                          type="text" 
                          className="outline-text-input" 
                          value={heading.text || ''}
                          onChange={(e) => handleHeadingTextChange(idx, e.target.value)}
                          disabled={!isEditingOutline}
                        />
                        {isEditingOutline && (
                          <button 
                            type="button" 
                            className="btn btn-danger" 
                            style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', fontSize: '0.8rem' }}
                            onClick={() => handleRemoveHeading(idx)}
                            title="Delete Heading"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recommended word limit */}
                  <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', opacity: 0.9 }}>
                    <span>Recommended Word Count: <strong>{outline?.suggestedWordCount || 1300}</strong></span>
                    <span>Mode: <strong>Human-in-the-Loop (User Guided)</strong></span>
                  </div>
                </div>
              </div>

              {/* Generate article trigger */}
              <button 
                onClick={generateArticle} 
                className="btn btn-primary" 
                style={{ alignSelf: 'flex-end', gap: '0.75rem', height: '3rem', padding: '0 2rem' }}
              >
                ✍️ Generate Full SEO Article
              </button>
            </div>

          {/* STEP 3: Article Autoriting Progress Shimmer */}
          <div style={{ 
            display: (loading && currentStep === 3) ? 'flex' : 'none',
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flex: 1, 
            textAlign: 'center',
            padding: '5rem 1rem'
          }}>
            <div className="shimmer" style={{ width: '90px', height: '90px', borderRadius: '50%', marginBottom: '2rem' }}></div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>✍️ Generating Article...</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', fontSize: '0.95rem', opacity: 0.9 }}>
              Advanced AI is analyzing competitor structures and writing a highly relevant, custom HTML article. This takes about 15-30 seconds.
            </p>
          </div>

          {/* STEP 3 (Completed): Article Preview + Publishing Section */}
          <div 
            style={{ 
              display: (articleContent && !publishResult && !loading) ? 'flex' : 'none',
              flexDirection: 'column', 
              gap: '2rem' 
            }}
          >
              
              {/* Two-Column Grid: Traditional SEO Score + AI GEO Visibility Score */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', width: '100%' }}>
                
                {/* Column 1: Traditional SEO Score */}
                <div className="glass-panel" style={{ background: 'rgba(16, 185, 129, 0.01)', padding: '1.5rem', borderLeft: '4px solid var(--success)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '220px' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📈 Live SEO Score Analyzer
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Optimize keywords live. Click to view deep criteria and optimization suggestions.
                    </p>
                  </div>
                  {renderPremiumScoreGauge()}
                </div>

                {/* Column 2: GEO (Generative Engine Optimization) Citation Scorer */}
                <div className="glass-panel" style={{ background: 'rgba(99, 102, 241, 0.01)', padding: '1.5rem', borderLeft: '4px solid var(--primary)', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                      🤖 GEO Görünürlük Analizi (LLM Citability)
                    </h4>
                    {geoScore !== null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: 'var(--primary-glow)',
                          border: '2px solid var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: 'var(--primary)'
                        }}>
                          {geoScore}
                        </div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>/100 Puan</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Analiz bekleniyor...</span>
                    )}
                  </div>

                  {geoScore !== null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>LLM Alıntılanma Potansiyeli:</span>
                        <span style={{ 
                          fontWeight: 800, 
                          color: geoPotential === 'High' ? 'var(--success)' : geoPotential === 'Medium' ? 'var(--warning)' : 'var(--error)',
                          background: geoPotential === 'High' ? 'rgba(16,185,129,0.08)' : 'var(--primary-glow)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          textTransform: 'uppercase'
                        }}>
                          {geoPotential}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>Yapay Zeka Görünürlük Önerileri:</strong>
                        <ul style={{ paddingLeft: '1.1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {geoRecs.map((rec, idx) => (
                            <li key={idx} style={{ lineHeight: '1.4' }}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {geoEntities.map((ent, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: 'rgba(15,23,42,0.04)', color: 'var(--text-secondary)', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                            🔗 {ent}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
                      <svg className="spinner-mini" style={{ width: '16px', height: '16px', color: 'var(--primary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Ajan semantik tarama yapıyor...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Split-View Semantic Layout Container */}
              <div className={`split-view-container ${isFullscreen ? 'fullscreen-editor-active' : ''}`}>
                
                {/* Left Pane: Minimalist Article Editor */}
                <div className="split-view-editor-pane">
                  
                  {/* Fullscreen header (only visible when in fullscreen mode) */}
                  {isFullscreen && (
                    <div className="fullscreen-editor-header">
                      <div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                          ✍️ Distraction-Free SEO Writer
                        </h3>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Focus purely on crafting organic content with real-time feedback</span>
                      </div>
                      <button 
                        onClick={() => setIsFullscreen(false)}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.825rem' }}
                      >
                        Exit Fullscreen ✕
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
                      📄 Article Workspace
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {/* Visual/Code View Tab triggers */}
                      <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(15,23,42,0.03)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <button 
                          className="btn" 
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.35rem 0.65rem', 
                            borderRadius: '6px',
                            background: activeTab === 'preview' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'preview' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: activeTab === 'preview' ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                          }}
                          onClick={() => setActiveTab('preview')}
                        >
                          Visual Preview
                        </button>
                        <button 
                          className="btn" 
                          style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.35rem 0.65rem', 
                            borderRadius: '6px',
                            background: activeTab === 'html' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'html' ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: activeTab === 'html' ? '0 2px 8px rgba(99,102,241,0.2)' : 'none'
                          }}
                          onClick={() => setActiveTab('html')}
                        >
                          HTML Editor
                        </button>
                      </div>

                      {/* Distraction Free Toggler */}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.75rem', borderRadius: '8px' }}
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title="Toggle Distraction-Free Fullscreen Editor"
                      >
                        {isFullscreen ? 'Collapse ⛶' : 'Fullscreen ⛶'}
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata layout card */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid var(--primary)', borderRight: '1px solid var(--border)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{outline?.suggestedTitle}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', opacity: 0.85, lineHeight: 1.5 }}>
                      Meta Description: {outline?.metaDescription}
                    </p>
                  </div>

                  {/* Copy/Download/Reflection controls */}
                  <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-end', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => outline && triggerReflection(outline.suggestedTitle)}
                      className="btn btn-secondary"
                      style={{ gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem', border: '1px dashed var(--accent)', color: 'var(--accent)' }}
                      disabled={loading}
                    >
                      {loading ? 'Optimizing...' : '🔄 Reflect & Auto-Optimize'}
                    </button>
                    <button 
                      onClick={copyToClipboard}
                      className="btn btn-secondary"
                      style={{ gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy HTML'}
                    </button>
                    <button 
                      onClick={downloadHtmlFile}
                      className="btn btn-secondary"
                      style={{ gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    >
                      📥 Download HTML
                    </button>
                  </div>

                  {/* Preview viewport — ErrorBoundary catches DOM reconciliation crashes from browser extensions / HMR */}
                  <div className="article-preview-container" style={{ minHeight: isFullscreen ? '55vh' : '450px' }}>
                    <HtmlContentBoundary
                      content={articleContent || ''}
                      className="article-preview-content"
                      style={{ display: activeTab === 'preview' ? 'block' : 'none' }}
                      highlightKeyword={hoveredKeyword}
                    />
                    
                    <textarea 
                      value={articleContent || ''}
                      onChange={(e) => setArticleContent(e.target.value)}
                      className="form-textarea"
                      placeholder="Write your article HTML here..."
                      style={{ 
                        display: activeTab === 'html' ? 'block' : 'none',
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.825rem', 
                        color: 'var(--text-secondary)', 
                        height: isFullscreen ? '55vh' : '400px',
                        background: '#fafbfc',
                        border: 'none',
                        outline: 'none',
                        lineHeight: 1.6
                      }}
                    />
                  </div>

                </div>

                {/* Right Pane: Sticky Semantic LSI Floating Panel */}
                <div className="split-view-semantic-pane">
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🔑 Semantik LSI Kelimeler
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Hover to highlight in preview workspace</span>
                  </div>

                  <div className="semantic-keyword-list">
                    {semanticKeywords.map((kw, idx) => {
                      const count = keywordCounts[kw] || 0;
                      const target = (kw.length % 3) + 1;
                      
                      let badgeClass = 'gray';
                      if (count >= target) badgeClass = 'green';
                      else if (count > 0) badgeClass = 'amber';

                      return (
                        <div 
                          key={idx}
                          className={`semantic-keyword-item ${hoveredKeyword === kw ? 'active-highlight' : ''}`}
                          onMouseEnter={() => setHoveredKeyword(kw)}
                          onMouseLeave={() => setHoveredKeyword(null)}
                        >
                          <span style={{ color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {kw}
                          </span>
                          <span className={`semantic-keyword-badge ${badgeClass}`}>
                            {count}/{target}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* CMS Integration panel */}
              <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(139,92,246,0.01)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.01em' }}>🔗 Step 4: Automated CMS Publishing</h4>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', opacity: 0.9 }}>
                  Push the generated article directly to WordPress REST API or Webflow CMS API as a draft, or trigger a simulated safe webhook callback.
                </p>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <CustomSelect 
                      label="Target CMS Platform"
                      value={selectedPlatform}
                      options={platformOptions}
                      onChange={setSelectedPlatform}
                    />
                  </div>
                  <button 
                    onClick={publishArticle} 
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', height: '3.2rem', padding: '0 2rem' }}
                  >
                    🚀 Publish to Blog
                  </button>
                </div>
              </div>
            </div>

          {/* STEP 4: CMS Publishing Progress Shimmer */}
          <div style={{ 
            display: (loading && currentStep === 4) ? 'flex' : 'none',
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flex: 1, 
            textAlign: 'center',
            padding: '5rem 1rem'
          }}>
            <div className="shimmer" style={{ width: '70px', height: '70px', borderRadius: '12px', marginBottom: '2rem' }}></div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>🚀 Connecting to CMS Platform...</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.95rem', opacity: 0.9 }}>
              Transferring rich content payloads to the chosen CMS API. Verifying integrity.
            </p>
          </div>

          {/* STEP 4 (Completed): Publishing Success/Error Screen */}
          <div 
            style={{ 
              display: (publishResult && !loading) ? 'flex' : 'none',
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1, 
              textAlign: 'center',
              padding: '4rem 2rem'
            }}
          >
            <div style={{ 
              width: '72px', 
              height: '72px', 
              borderRadius: '50%', 
              background: publishResult?.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
              border: `2px solid ${publishResult?.success ? 'var(--success)' : 'var(--error)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              marginBottom: '2rem',
              color: publishResult?.success ? 'var(--success)' : 'var(--error)',
              boxShadow: publishResult?.success ? '0 0 20px -5px rgba(16, 185, 129, 0.4)' : 'none'
            }}>
              {publishResult?.success ? '✓' : '✗'}
            </div>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              {publishResult?.success ? 'Successfully Published!' : 'Publishing Error'}
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', fontSize: '0.98rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
              {publishResult?.message}
            </p>

            {publishResult?.success && publishResult?.url && (
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <a 
                  href={publishResult?.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-primary"
                  style={{ gap: '0.5rem', height: '3rem', padding: '0 2rem' }}
                >
                  View Published Article ↗
                </a>
                <button 
                  onClick={() => {
                    setCurrentStep(0);
                    setStepStatuses(['pending', 'pending', 'pending', 'pending']);
                    setPublishResult(null);
                    setArticleContent(null);
                    setOutline(null);
                    setKeyword('');
                  }}
                  className="btn btn-secondary"
                  style={{ height: '3rem', padding: '0 1.5rem' }}
                >
                  Generate New Article
                </button>
              </div>
            )}

            {publishResult && !publishResult.success && (
              <button 
                onClick={() => setPublishResult(null)} 
                className="btn btn-primary"
                style={{ height: '3rem', padding: '0 2rem' }}
              >
                Go Back & Retry
              </button>
            )}
          </div>

        </main>

        {/* 🟢 Slide-Over SEO Optimization Drawer (Flyout Panel) */}
        <div 
          className={`seo-flyout-overlay ${isSeoPanelOpen ? 'open' : ''}`}
          onClick={() => setIsSeoPanelOpen(false)}
        />
        <div className={`seo-flyout ${isSeoPanelOpen ? 'open' : ''}`}>
          <div className="seo-flyout-header">
            <div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📊 Real-time SEO Guidelines
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Score detail checklist and semantic criteria</span>
            </div>
            <button 
              type="button" 
              className="seo-flyout-close" 
              onClick={() => setIsSeoPanelOpen(false)}
              aria-label="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="seo-flyout-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(99,102,241,0.03)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Current SEO Grade</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: 850, color: seoReport.score >= 80 ? 'var(--success)' : seoReport.score >= 50 ? 'var(--warning)' : 'var(--error)', letterSpacing: '-0.03em' }}>{seoReport.score}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)' }}>/100 Points</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(15,23,42,0.05)', borderRadius: '3px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${seoReport.score}%`, 
                    background: seoReport.score >= 80 ? 'var(--success)' : seoReport.score >= 50 ? 'var(--warning)' : 'var(--error)',
                    transition: 'width 0.5s ease-out'
                  }} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SEO Checklist Checks</h5>
              <div className="seo-recs-list">
                {seoReport.items.map((item, idx) => (
                  <div key={idx} className={`seo-rec-card ${item.passed ? 'passed' : 'failed'}`}>
                    <span style={{ 
                      fontSize: '1.1rem', 
                      color: item.passed ? 'var(--success)' : 'var(--warning)',
                      marginTop: '-2px'
                    }}>
                      {item.passed ? '✓' : '○'}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: '1.4' }}>{item.text}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: item.passed ? 'var(--success)' : 'var(--text-muted)' }}>
                        {item.passed ? `Passed (+${item.impact})` : `Action Required (${item.impact})`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
