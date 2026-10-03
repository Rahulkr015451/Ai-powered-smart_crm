import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Mail,
  Users,
  RefreshCw,
  Sparkles,
  BrainCircuit,
  ArrowRight,
  LogOut,
  Shield,
  BarChart3,
  Bot,
  Send,
  Copy,
  Check,
} from "lucide-react";

const API_BASE = "http://localhost:5000";

// ─── Helpers ──────────────────────────────────

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// ─── Landing Page ─────────────────────────────

function LandingPage({ onSignIn }) {
  return (
    <div className="landing-page">
      <div className="landing-card">
        <div className="landing-logo">
          <Zap size={32} color="#fff" />
        </div>
        <h1 className="landing-title">Smart CRM</h1>
        <p className="landing-subtitle">
          AI-powered customer intelligence.
          <br />
          Sync your <strong>Gmail</strong>, track leads, and draft replies with{" "}
          <strong>Gemini AI</strong> — all in one place.
        </p>
        <button className="google-btn" onClick={onSignIn}>
          <Mail size={18} />
          Sign in with Google
          <ArrowRight size={16} />
        </button>
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <Mail size={20} />
            </div>
            <div className="landing-feature-label">Gmail Sync</div>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <Shield size={20} />
            </div>
            <div className="landing-feature-label">Secure OAuth</div>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">
              <BrainCircuit size={20} />
            </div>
            <div className="landing-feature-label">Gemini AI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────

function Dashboard({ token, onLogout }) {
  const [emails, setEmails] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [aiDraft, setAiDraft] = useState(null);
  const [pageToken, setPageToken] = useState(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  // New State for Contacts Tab
  const [activeTab, setActiveTab] = useState("inbox");
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const fetchDashboard = useCallback(async (loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoadingEmails(true);
      setSyncing(true);
    }
    
    try {
      const url = new URL(`${API_BASE}/api/crm/dashboard`);
      if (loadMore && pageToken) {
        url.searchParams.append("pageToken", pageToken);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      
      const data = await res.json();
      
      if (loadMore) {
        setEmails(prev => [...prev, ...(data.emails || [])]);
      } else {
        setEmails(data.emails || []);
      }
      
      setPageToken(data.nextPageToken || null);
      setTotalContacts(data.totalContacts || 0);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      } else {
        setLoadingEmails(false);
        setSyncing(false);
      }
    }
  }, [token, pageToken]);

  // Initial fetch
  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingContacts(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "customers") fetchContacts();
  }, [activeTab, fetchContacts]);

  const handleInvokeGemini = async (email) => {
    setSelectedEmail(email);
    setAiDraft(null);
    setLoadingAI(true);
    setCopied(false);
    setSent(false);
    try {
      const res = await fetch(`${API_BASE}/api/ai/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          emailSnippet: `From: ${email.from}\nSubject: ${email.subject}\n\n${email.snippet}`,
        }),
      });
      if (!res.ok) throw new Error("AI draft failed");
      const data = await res.json();
      setAiDraft(data);
    } catch (err) {
      console.error("AI draft error:", err);
      setAiDraft({
        replyText: "Sorry, the AI assistant encountered an error. Please try again.",
        sentiment: "Neutral",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const handleCopyDraft = () => {
    if (aiDraft?.replyText) {
      navigator.clipboard.writeText(aiDraft.replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendEmail = async () => {
    if (!aiDraft?.replyText || !selectedEmail) return;
    
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/crm/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: selectedEmail.email,
          name: selectedEmail.from,
          subject: selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
          text: aiDraft.replyText,
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      setSent(true);
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const getSentimentClass = (sentiment) => {
    if (!sentiment) return "sentiment-neutral";
    const s = sentiment.toLowerCase();
    if (s === "positive") return "sentiment-positive";
    if (s === "negative") return "sentiment-negative";
    return "sentiment-neutral";
  };

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">
            <Zap size={18} color="#fff" />
          </div>
          <span className="header-title">Smart CRM</span>
        </div>

        <div className="header-stats">
          <button 
            className={`btn btn-sm ${activeTab === 'inbox' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('inbox')}
          >
            <Mail size={14} /> Inbox
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'customers' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={14} /> Customers
          </button>
          
          <div className="stat-badge" style={{ marginLeft: '12px' }}>
            <Users size={14} />
            Tracked Leads
            <span className="stat-number">{totalContacts}</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={fetchDashboard}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "syncing-icon" : ""} />
            {syncing ? "Syncing…" : "Sync Mailbox"}
          </button>
          <button className="btn btn-logout" onClick={onLogout}>
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      {activeTab === 'inbox' ? (
        <div className="main-content">
          {/* ── Left Panel: Inbox ── */}
          <div className="panel panel-left">
            <div className="panel-header">
              <div className="panel-title">
                <Mail size={16} className="panel-title-icon" />
                Inbound Emails
                {emails.length > 0 && (
                  <span className="panel-count">{emails.length}</span>
                )}
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => fetchDashboard(false)}>
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>

            <div className="panel-body">
              {loadingEmails && !loadingMore ? (
                <div className="email-list">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="skeleton skeleton-card" />
                  ))}
                </div>
              ) : emails.length === 0 ? (
                <div className="workbench-empty">
                  <div className="workbench-empty-icon">
                    <Mail size={32} />
                  </div>
                  <h3>No emails yet</h3>
                  <p>Click "Sync Mailbox" to pull your latest Gmail messages.</p>
                </div>
              ) : (
                <div className="email-list">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className={`email-card${selectedEmail?.id === email.id ? " active" : ""}`}
                      onClick={() => setSelectedEmail(email)}
                    >
                      <div className="email-card-header">
                        <div className="email-sender">
                          <div className="sender-avatar">
                            {getInitials(email.from)}
                          </div>
                          <div className="sender-info">
                            <div className="sender-name">{email.from}</div>
                            <div className="sender-email">{email.email}</div>
                          </div>
                        </div>
                        <div className="email-date">{formatDate(email.date)}</div>
                      </div>
                      <div className="email-subject">{email.subject}</div>
                      <div className="email-snippet">{email.snippet}</div>
                      <div className="email-card-footer">
                        <span className="email-stage-badge">Lead</span>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInvokeGemini(email);
                          }}
                        >
                          <Sparkles size={12} />
                          Invoke Gemini
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {pageToken && (
                    <button 
                      className="btn btn-ghost" 
                      style={{ marginTop: '12px', justifyContent: 'center' }}
                      onClick={() => fetchDashboard(true)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load Older Emails'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: AI Workbench ── */}
          <div className="panel panel-right">
            <div className="panel-header">
              <div className="panel-title">
                <Bot size={16} className="panel-title-icon" />
                Gemini Assistant Engine
              </div>
              {aiDraft && (
                <div className="panel-title">
                  <BarChart3 size={14} className="panel-title-icon" />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    Analysis Complete
                  </span>
                </div>
              )}
            </div>

            <div className="panel-body">
              {loadingAI ? (
                <div className="loading-overlay">
                  <div className="spinner" />
                  <div className="loading-text">Gemini is thinking…</div>
                  <div className="loading-subtext">
                    Analyzing sentiment &amp; drafting reply
                  </div>
                </div>
              ) : !selectedEmail ? (
                <div className="workbench-empty">
                  <div className="workbench-empty-icon">
                    <BrainCircuit size={36} />
                  </div>
                  <h3>AI Workbench</h3>
                  <p>
                    Select an email and click "Invoke Gemini" to generate an
                    AI-powered draft reply with sentiment analysis.
                  </p>
                </div>
              ) : !aiDraft ? (
                <div className="ai-response">
                  <div className="ai-context-card">
                    <div className="ai-context-label">Selected Email</div>
                    <div className="ai-context-subject">
                      {selectedEmail.subject}
                    </div>
                    <div className="ai-context-from">
                      From: {selectedEmail.from} &lt;{selectedEmail.email}&gt;
                    </div>
                  </div>
                  <div className="workbench-empty" style={{ flex: 1 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleInvokeGemini(selectedEmail)}
                    >
                      <Sparkles size={16} />
                      Invoke Gemini Assistant Engine
                    </button>
                    <p>Click above to analyze this email and generate a reply.</p>
                  </div>
                </div>
              ) : (
                <div className="ai-response">
                  {/* Context */}
                  <div className="ai-context-card">
                    <div className="ai-context-label">Analyzing Email</div>
                    <div className="ai-context-subject">
                      {selectedEmail.subject}
                    </div>
                    <div className="ai-context-from">
                      From: {selectedEmail.from}
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div className="sentiment-section">
                    <span className="sentiment-label">Customer Sentiment:</span>
                    <span
                      className={`sentiment-badge ${getSentimentClass(aiDraft.sentiment)}`}
                    >
                      {aiDraft.sentiment === "Positive" && "😊"}
                      {aiDraft.sentiment === "Neutral" && "😐"}
                      {aiDraft.sentiment === "Negative" && "😟"}
                      {aiDraft.sentiment}
                    </span>
                  </div>

                  {/* Draft */}
                  <div className="ai-draft-section">
                    <div className="ai-draft-header">
                      <div className="ai-draft-label">
                        <Send size={14} />
                        Gemini-Generated Draft Reply
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={handleCopyDraft}
                        >
                          {copied ? (
                            <>
                              <Check size={12} /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={handleSendEmail}
                          disabled={sending || sent}
                        >
                          {sent ? (
                            <>
                              <Check size={12} /> Sent!
                            </>
                          ) : (
                            <>
                              <Send size={12} /> {sending ? "Sending..." : "Send Reply"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="ai-draft-textarea"
                      value={aiDraft.replyText}
                      onChange={(e) => setAiDraft({...aiDraft, replyText: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content" style={{ display: 'block', padding: '24px' }}>
          <div className="panel" style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
              <Users size={20} style={{ marginRight: '10px', color: 'var(--text-accent)' }}/> Customer Directory
            </h2>
            {loadingContacts ? (
              <div className="loading-overlay">
                <div className="spinner" />
                <div className="loading-text">Loading Contacts…</div>
              </div>
            ) : contacts.length === 0 ? (
              <div className="workbench-empty">
                <div className="workbench-empty-icon"><Users size={32} /></div>
                <h3>No Customers Found</h3>
                <p>Sync your mailbox to automatically build your directory.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '16px' }}>Name</th>
                      <th style={{ padding: '16px' }}>Email</th>
                      <th style={{ padding: '16px' }}>Stage</th>
                      <th style={{ padding: '16px' }}>Interactions</th>
                      <th style={{ padding: '16px' }}>Latest Reply</th>
                      <th style={{ padding: '16px' }}>Added On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card-hover)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px' }}>
                          <div className="email-sender">
                            <div className="sender-avatar" style={{width:'32px', height:'32px', fontSize:'0.7rem'}}>{getInitials(c.name)}</div>
                            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{c.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{c.email}</td>
                        <td style={{ padding: '16px' }}>
                          <span className={c.stage === 'Prospect' ? 'sentiment-badge sentiment-positive' : 'email-stage-badge'}>
                            {c.stage}
                          </span>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-primary)', fontWeight: '600' }}>
                          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                            <BarChart3 size={14} color="var(--text-muted)" />
                            {c._count.interactions}
                          </div>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {(() => {
                            const lastReply = c.interactions?.find(i => i.type.includes('Reply'));
                            if (!lastReply) return '-';
                            return (
                              <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={lastReply.summary}>
                                💬 {lastReply.summary}
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App (Root) ───────────────────────────────

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("crm_token"));

  // On mount: check URL for ?token=... (OAuth callback redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      localStorage.setItem("crm_token", urlToken);
      setToken(urlToken);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSignIn = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Sign-in error:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("crm_token");
    setToken(null);
  };

  if (!token) {
    return <LandingPage onSignIn={handleSignIn} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}

export default App;
