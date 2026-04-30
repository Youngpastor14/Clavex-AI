import { useState, useEffect, useCallback } from "react";

// ─── SERVICE LABELS ─────────────────────────────────────────────────────────
const SERVICE_LABELS = {
  brand_strategy: { name: "Brand Strategy", color: "#3b82f6", icon: "◈" },
  brand_identity: { name: "Brand Identity", color: "#6366f1", icon: "◉" },
  uiux: { name: "UI/UX Design", color: "#0ea5e9", icon: "◎" },
  web_development: { name: "Web Development", color: "#14b8a6", icon: "◪" },
  social_media: { name: "Social Media Design", color: "#f59e0b", icon: "◫" },
};

const STATUS_COLORS = {
  new: { bg: "rgba(59,130,246,.12)", text: "#60a5fa", border: "rgba(59,130,246,.3)" },
  contacted: { bg: "rgba(245,158,11,.12)", text: "#fbbf24", border: "rgba(245,158,11,.3)" },
  converted: { bg: "rgba(34,197,94,.12)", text: "#4ade80", border: "rgba(34,197,94,.3)" },
};

// ─── STYLES (shared) ────────────────────────────────────────────────────────
const FONT = "'DM Sans',sans-serif";
const SYNE = "'Syne',sans-serif";

const card = {
  background: "rgba(255,255,255,.035)",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: "14px",
  padding: "20px",
};

// ─── INTEL DASHBOARD ────────────────────────────────────────────────────────
export default function IntelDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [storedPw, setStoredPw] = useState("");

  // Check if URL has ?id= parameter for direct link access
  const urlParams = new URLSearchParams(window.location.search);
  const directId = urlParams.get("id");

  // ── AUTH ──────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?password=${encodeURIComponent(password)}&limit=1`);
      if (res.ok) {
        setAuthed(true);
        setStoredPw(password);
        // If direct ID link, load that lead
        if (directId) {
          loadLeadDetail(directId, password);
        } else {
          loadLeads(password);
        }
      } else {
        setAuthError("Wrong password. Try again.");
      }
    } catch {
      setAuthError("Connection error. Try again.");
    }
    setLoading(false);
  };

  // ── LOAD LEADS ───────────────────────────────────────────────────────
  const loadLeads = useCallback(async (pw) => {
    setLoading(true);
    try {
      let url = `/api/leads?password=${encodeURIComponent(pw)}&limit=100`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {}
    setLoading(false);
  }, [statusFilter]);

  // ── LOAD SINGLE LEAD ─────────────────────────────────────────────────
  const loadLeadDetail = async (id, pw) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${id}?password=${encodeURIComponent(pw || storedPw)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data.lead);
      }
    } catch {}
    setLoading(false);
  };

  // ── UPDATE STATUS ────────────────────────────────────────────────────
  const updateStatus = async (id, newStatus) => {
    try {
      await fetch(`/api/leads/${id}?password=${encodeURIComponent(storedPw)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      // Update local state
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    } catch {}
  };

  // Reload on filter change
  useEffect(() => {
    if (authed) loadLeads(storedPw);
  }, [statusFilter, authed, storedPw, loadLeads]);

  // ── LOGIN SCREEN ─────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#04080f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        <div style={{ ...card, maxWidth: "380px", width: "90%", textAlign: "center" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "linear-gradient(145deg,#0e1f38,#1a4f96)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 28px rgba(26,79,150,.4)" }}>
            <span style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "18px", color: "#fff" }}>C</span>
          </div>
          <h1 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "22px", color: "#fff", marginBottom: "6px" }}>Brand Intel</h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,.3)", marginBottom: "24px", letterSpacing: "0.06em" }}>Fortex Forge · Internal</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "10px", color: "#fff", fontSize: "14px", fontFamily: FONT, marginBottom: "12px", outline: "none" }}
            />
            {authError && <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{authError}</p>}
            <button type="submit" disabled={loading || !password}
              style={{ width: "100%", padding: "13px", background: "linear-gradient(145deg,#0e2a4a,#1648a0)", border: "1px solid rgba(74,144,217,.35)", borderRadius: "10px", color: "#fff", fontSize: "14px", fontWeight: 600, fontFamily: FONT, cursor: "pointer", opacity: loading ? 0.6 : 1 }}
            >{loading ? "Checking..." : "Access Dashboard"}</button>
          </form>
        </div>
      </div>
    );
  }

  // ── LEAD DETAIL VIEW ─────────────────────────────────────────────────
  if (selectedLead) {
    const lead = selectedLead;
    const svc = SERVICE_LABELS[lead.service] || SERVICE_LABELS.brand_strategy;
    const st = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
    const intel = lead.brand_intel || {};
    const convo = lead.full_conversation || [];

    return (
      <div style={{ position: "fixed", inset: 0, background: "#04080f", overflowY: "auto", fontFamily: FONT }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "28px 20px 40px" }}>
          {/* Back button */}
          <button onClick={() => setSelectedLead(null)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: "13px", fontFamily: FONT, cursor: "pointer", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}
          >← Back to all leads</button>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "24px", color: "#fff", marginBottom: "4px" }}>
                {lead.first_name || "Anonymous"}{" "}
                <span style={{ fontSize: "14px", color: svc.color, fontFamily: FONT, fontWeight: 500 }}>· {svc.name}</span>
              </h1>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,.3)" }}>
                {new Date(lead.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {lead.whatsapp_clicked && <span style={{ marginLeft: "10px", color: "#22c55e" }}>✓ WhatsApp clicked</span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {["new", "contacted", "converted"].map(s => (
                <button key={s} onClick={() => updateStatus(lead.id, s)}
                  style={{ padding: "6px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all .2s", background: lead.status === s ? STATUS_COLORS[s].bg : "rgba(255,255,255,.03)", border: `1px solid ${lead.status === s ? STATUS_COLORS[s].border : "rgba(255,255,255,.06)"}`, color: lead.status === s ? STATUS_COLORS[s].text : "rgba(255,255,255,.25)" }}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Problem Summary */}
          <div style={{ ...card, marginBottom: "16px", borderLeft: `3px solid ${svc.color}` }}>
            <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Problem Summary</p>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,.7)", lineHeight: "1.7" }}>{lead.problem_summary}</p>
          </div>

          {/* Brand Intelligence */}
          {Object.keys(intel).length > 0 && (
            <div style={{ ...card, marginBottom: "16px" }}>
              <p style={{ fontSize: "10.5px", color: "#4a90d9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px", fontWeight: 600 }}>✦ Brand Intelligence</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
                {[
                  { label: "Business", value: intel.business_name },
                  { label: "Industry", value: intel.industry },
                  { label: "What They Do", value: intel.what_they_do },
                  { label: "Target Audience", value: intel.target_audience },
                  { label: "Running Since", value: intel.how_long_running },
                  { label: "Team Size", value: intel.team_size },
                  { label: "Online Presence", value: intel.online_presence },
                  { label: "Revenue Model", value: intel.revenue_model },
                  { label: "Core Gap", value: intel.core_gap },
                  { label: "What They've Tried", value: intel.what_they_tried },
                  { label: "Competitors", value: intel.competitors_mentioned },
                  { label: "Urgency", value: intel.urgency_level },
                ].filter(f => f.value).map((f, i) => (
                  <div key={i}>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{f.label}</p>
                    <p style={{ fontSize: "13.5px", color: "rgba(255,255,255,.6)", lineHeight: "1.6" }}>{f.value}</p>
                  </div>
                ))}
              </div>

              {/* Challenges */}
              {intel.current_challenges && intel.current_challenges.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Challenges</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {intel.current_challenges.map((c, i) => (
                      <span key={i} style={{ padding: "5px 12px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.15)", borderRadius: "8px", fontSize: "12px", color: "rgba(255,255,255,.5)" }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Quotes */}
              {intel.key_quotes && intel.key_quotes.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Key Quotes</p>
                  {intel.key_quotes.map((q, i) => (
                    <p key={i} style={{ fontSize: "13px", color: "rgba(255,255,255,.45)", lineHeight: "1.6", fontStyle: "italic", marginBottom: "6px", paddingLeft: "12px", borderLeft: "2px solid rgba(74,144,217,.2)" }}>"{q}"</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full Conversation */}
          <div style={{ ...card }}>
            <p style={{ fontSize: "10.5px", color: "#4a90d9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px", fontWeight: 600 }}>Full Conversation</p>
            {convo.map((msg, i) => (
              <div key={i} style={{ marginBottom: "14px", display: "flex", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: msg.role === "assistant" ? "linear-gradient(145deg,#0e1f38,#1a4f96)" : "rgba(255,255,255,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700, color: msg.role === "assistant" ? "#fff" : "rgba(255,255,255,.4)" }}>
                  {msg.role === "assistant" ? "C" : "U"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "10px", color: "rgba(255,255,255,.2)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{msg.role === "assistant" ? "Clavex" : "User"}</p>
                  <p style={{ fontSize: "13.5px", color: msg.role === "assistant" ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.7)", lineHeight: "1.65", whiteSpace: "pre-wrap" }}>{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── LEAD LIST VIEW ───────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "#04080f", overflowY: "auto", fontFamily: FONT }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "28px 20px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: "24px", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(145deg,#0e1f38,#1a4f96)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>C</span>
              Brand Intel
            </h1>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,.25)", marginTop: "4px" }}>{leads.length} lead{leads.length !== 1 ? "s" : ""} captured</p>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {["all", "new", "contacted", "converted"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: "7px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 600, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.06em", cursor: "pointer", transition: "all .2s", background: statusFilter === s ? (s === "all" ? "rgba(74,144,217,.12)" : STATUS_COLORS[s]?.bg || "rgba(74,144,217,.12)") : "rgba(255,255,255,.03)", border: `1px solid ${statusFilter === s ? (s === "all" ? "rgba(74,144,217,.3)" : STATUS_COLORS[s]?.border || "rgba(74,144,217,.3)") : "rgba(255,255,255,.06)"}`, color: statusFilter === s ? (s === "all" ? "#60a5fa" : STATUS_COLORS[s]?.text || "#60a5fa") : "rgba(255,255,255,.3)" }}
              >{s}</button>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: "rgba(255,255,255,.3)", textAlign: "center", padding: "40px 0" }}>Loading...</p>}

        {!loading && leads.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,.3)", marginBottom: "8px" }}>No leads yet</p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,.18)" }}>Leads will appear here after users complete a Clavex diagnosis.</p>
          </div>
        )}

        {/* Lead cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {leads.map(lead => {
            const svc = SERVICE_LABELS[lead.service] || SERVICE_LABELS.brand_strategy;
            const st = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
            const intel = lead.brand_intel || {};
            return (
              <button key={lead.id} onClick={() => loadLeadDetail(lead.id)}
                style={{ ...card, cursor: "pointer", textAlign: "left", width: "100%", display: "flex", alignItems: "center", gap: "16px", transition: "all .2s ease", padding: "16px 20px" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.055)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.035)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; }}
              >
                {/* Service icon */}
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `linear-gradient(145deg,${svc.color}12,${svc.color}28)`, border: `1px solid ${svc.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{svc.icon}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff" }}>{lead.first_name || "Anonymous"}</span>
                    <span style={{ fontSize: "11px", color: svc.color, fontWeight: 500 }}>{svc.name}</span>
                    {lead.whatsapp_clicked && <span style={{ fontSize: "10px", color: "#22c55e" }}>✓ WA</span>}
                  </div>
                  <p style={{ fontSize: "12.5px", color: "rgba(255,255,255,.4)", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {intel.what_they_do || lead.problem_summary || "No details"}
                  </p>
                </div>

                {/* Status + date */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: "6px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", background: st.bg, color: st.text, border: `1px solid ${st.border}`, marginBottom: "4px" }}>{lead.status}</span>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,.2)" }}>
                    {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
