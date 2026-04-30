import { useState, useEffect, useRef, useCallback } from "react";
import IntelDashboard from "./IntelDashboard";

// ─── SERVICES ────────────────────────────────────────────────────────────────
const SERVICES = {
  brand_strategy: {
    name: "Brand Strategy",
    tag: "You don't have a growth problem. You have a clarity problem.",
    description: "Without a clear strategy, every effort you make lands softer than it should. Brand Strategy defines exactly who you are, who you're for, and why you're the only choice — so everything else you do starts working harder.",
    cost: "Right now, every naira you spend on marketing, content, or ads is landing softer than it should — because there's no clear strategy behind it. You're working hard, but the results don't match the effort. The longer this stays unclear, the more you spend fixing symptoms instead of the root problem.",
    outcome: "Imagine knowing exactly who your brand is for, what makes you the obvious choice, and having every piece of content, every campaign, every conversation pull in the same direction. That's what clarity does — it turns effort into momentum.",
    icon: "◈", color: "#3b82f6",
  },
  brand_identity: {
    name: "Brand Identity",
    tag: "Your work is good. Your brand just isn't showing it.",
    description: "First impressions happen in seconds. If your visual identity doesn't communicate quality instantly, the best clients won't stay long enough to see what you can actually do. Brand Identity fixes that permanently.",
    cost: "People are judging your business in seconds — before they read a single word. If your visuals say 'amateur,' the best clients scroll past you and go to competitors whose work isn't even as good as yours. Every day without a strong identity is another day premium clients choose someone who just looks the part better.",
    outcome: "Picture this: a client lands on your page, sees your brand, and immediately thinks 'this is professional.' They trust you before you've even spoken. That's what a proper identity does — it closes the gap between how good you actually are and how good you look.",
    icon: "◉", color: "#6366f1",
  },
  uiux: {
    name: "UI/UX Design",
    tag: "People are visiting but not staying. That's a design problem.",
    description: "A confusing digital experience costs you clients silently — they leave without telling you why. UI/UX Design turns your digital touchpoints into something that feels easy, clear, and trustworthy.",
    cost: "People are finding you — that's the frustrating part. They're landing on your site or app, looking around, getting confused or frustrated, and leaving. They never tell you why. You're paying for traffic that bounces, and every lost visitor is a client your competitor gets for free.",
    outcome: "When your digital experience feels effortless, people stay, explore, and take action. They contact you, they buy, they come back. It's the difference between a storefront with locked doors and one that invites people in.",
    icon: "◎", color: "#0ea5e9",
  },
  web_development: {
    name: "Web Development",
    tag: "If you don't exist online properly, you don't exist at all.",
    description: "Your website is your hardest-working salesperson. Without one — or with a broken one — you're losing clients every single day to competitors who simply showed up better online.",
    cost: "Every time someone searches for what you do and can't find you — or finds a broken, outdated site — they go to the next option. Your competitors don't need to be better than you. They just need to be easier to find and easier to trust online. Right now, they are.",
    outcome: "A website that works for you means clients find you at 2am, learn what you do, trust you, and reach out — all while you sleep. It's not just a page, it's your most reliable salesperson working 24/7.",
    icon: "◪", color: "#14b8a6",
  },
  social_media: {
    name: "Social Media Design",
    tag: "You're posting but nobody is stopping to look.",
    description: "Scroll stops are earned, not given. If your content blends into the feed, your message never lands no matter how good it is. Social Media Design gives your brand the visual power to stop the scroll and stay memorable.",
    cost: "You're spending time creating content, but it disappears into the feed. No engagement, no saves, no shares. The message might be great — but if the visual doesn't stop the scroll, nobody ever reads it. All that effort, invisible.",
    outcome: "When your content looks undeniable, people stop scrolling. They read, they engage, they remember you. Your posts start working like micro-billboards — each one building recognition, trust, and demand without you having to chase anyone.",
    icon: "◫", color: "#f59e0b",
  },
};

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: "What is Clavex?", a: "Clavex is a free AI-powered brand diagnostic tool built by Fortex Forge — a creative tech agency specializing in brand strategy, identity, UI/UX design, and web development. It helps you discover exactly what's holding your business back, in minutes." },
  { q: "Who is Fortex Forge?", a: "Fortex Forge is the creative tech agency behind Clavex. They specialize in Brand Strategy, Brand Identity, UI/UX Design, Web Development, and Social Media Design. Their tagline: Forging Absolute Clarity." },
  { q: "How much do services cost?", a: "Pricing depends on what your brand actually needs. Packages start from ₦400,000. Send a WhatsApp message to +234 706 881 1791 to get a proper conversation going with the Fortex Forge team." },
  { q: "Can you help a brand new business?", a: "Absolutely. Whether you're starting from zero or you've been around a while and things aren't clicking, the Fortex Forge team starts with where you are and builds from there." },
  { q: "How long does a project take?", a: "Brand identity projects usually take 2 to 4 weeks. Web development takes 3 to 8 weeks. You'll always get a clear timeline upfront." },
  { q: "Do you work outside Nigeria?", a: "Yes. Fortex Forge works with clients across Africa and beyond. Everything runs smoothly online." },
  { q: "What makes this different?", a: "Clavex starts with strategy, not aesthetics. Every recommendation is backed by what you actually told the AI — not a generic template. That's what Forging Absolute Clarity means." },
];

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 800;
const SESSION_KEY = "clavex_session";

// ─── ANALYTICS HELPER ────────────────────────────────────────────────────────
function trackEvent(type, data = {}) {
  try {
    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, data }),
    }).catch(() => {}); // fire-and-forget, never block UI
  } catch (_) {}
}

// ─── SESSION PERSISTENCE ─────────────────────────────────────────────────────
function saveSession(messages, history, result) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      messages,
      history,
      result,
      savedAt: Date.now(),
    }));
  } catch (_) {}
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Expire sessions older than 30 minutes
    if (Date.now() - data.savedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch (_) {
    return null;
  }
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@700;800&family=Playfair+Display:ital,wght@1,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; background: #04080f; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: rgba(74,144,217,0.2); border-radius: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  @keyframes tdot { 0%,60%,100%{transform:translateY(0);opacity:.3;} 30%{transform:translateY(-6px);opacity:1;} }
  @keyframes msgIn { from{opacity:0;transform:translateY(12px) scale(.97);} to{opacity:1;transform:translateY(0) scale(1);} }
  @keyframes floatF { 0%,100%{transform:translateY(0px);} 50%{transform:translateY(-10px);} }
  @keyframes shimmer { 0%{background-position:0% center;} 100%{background-position:200% center;} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
  @keyframes fadeIn { from{opacity:0;} to{opacity:1;} }
  @keyframes resultIn { from{opacity:0;transform:translateY(28px);} to{opacity:1;transform:translateY(0);} }
  @keyframes worldOut { from{opacity:1;transform:scale(1);} to{opacity:0;transform:scale(1.04);} }
  @keyframes worldIn { from{opacity:0;transform:scale(0.97);} to{opacity:1;transform:scale(1);} }
  @keyframes grain { 0%,100%{transform:translate(0,0);} 25%{transform:translate(-2%,-3%);} 50%{transform:translate(3%,2%);} 75%{transform:translate(-1%,4%);} }
  @keyframes orb1 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(40px,-30px);} }
  @keyframes orb2 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(-30px,40px);} }
  @keyframes orb3 { 0%,100%{transform:translate(0,0);} 50%{transform:translate(20px,30px);} }
  @keyframes pulse { 0%,100%{opacity:.5;} 50%{opacity:1;} }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
  button:focus-visible { outline: 2px solid #4A90D9; outline-offset: 3px; border-radius: 8px; }
  textarea { resize: none; }
  textarea:focus, input:focus { outline: none; }
`;

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function ClavexAvatar({ size = 32 }) {
  return (
    <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:"50%", background:"linear-gradient(145deg,#0e1f38,#1a4f96)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:`${Math.round(size*.37)}px`, color:"#fff", boxShadow:`0 2px 14px rgba(26,79,150,.45)` }}>C</div>
  );
}

function TypingDots() {
  return (
    <div style={{ display:"flex", gap:"5px", padding:"13px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"6px 16px 16px 16px", alignItems:"center" }}>
      {[0,1,2].map(i => <span key={i} style={{ display:"block", width:"6px", height:"6px", borderRadius:"50%", background:"#4a90d9", animation:"tdot 1.3s ease-in-out infinite", animationDelay:`${i*.18}s` }} />)}
    </div>
  );
}

function ChatBubble({ msg, isNew, isStreaming }) {
  const isClavex = msg.role === "assistant";
  return (
    <div style={{ display:"flex", justifyContent:isClavex?"flex-start":"flex-end", marginBottom:"16px", animation:isNew?"msgIn .38s cubic-bezier(.34,1.56,.64,1) forwards":"none", opacity:isNew?0:1 }}>
      {isClavex && <div style={{ marginRight:"10px", marginTop:"2px" }}><ClavexAvatar size={32}/></div>}
      <div style={{ maxWidth:"76%", padding:"13px 17px", borderRadius:isClavex?"5px 16px 16px 16px":"16px 5px 16px 16px", background:isClavex?"rgba(255,255,255,0.045)":"linear-gradient(145deg,#0e2a4a,#1648a0)", border:isClavex?"1px solid rgba(255,255,255,0.07)":"1px solid rgba(74,144,217,0.25)", fontSize:"14.5px", lineHeight:"1.72", color:isClavex?"#c8dcf5":"#fff", fontFamily:"'DM Sans',sans-serif", whiteSpace:"pre-wrap", boxShadow:isClavex?"none":"0 4px 22px rgba(22,72,160,.3)" }}>
        {msg.content}
        {isStreaming && <span style={{ display:"inline-block", width:"2px", height:"14px", background:"#4a90d9", marginLeft:"2px", verticalAlign:"middle", animation:"blink .7s ease-in-out infinite" }} />}
      </div>
    </div>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
function LandingPage({ onEnter, exiting }) {
  useEffect(() => {
    trackEvent("page_view");
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, background:"#04080f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:10, animation:exiting?"worldOut .6s cubic-bezier(.4,0,1,1) forwards":"fadeIn .4s ease forwards", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:"-50%", width:"200%", height:"200%", backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`, animation:"grain 8s steps(2) infinite", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"absolute", top:"-10%", right:"-5%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle,rgba(14,47,96,.6) 0%,transparent 65%)", pointerEvents:"none", animation:"orb1 10s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"absolute", bottom:"-15%", left:"-8%", width:"420px", height:"420px", borderRadius:"50%", background:"radial-gradient(circle,rgba(20,60,130,.35) 0%,transparent 65%)", pointerEvents:"none", animation:"orb2 13s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"absolute", top:"40%", left:"10%", width:"280px", height:"280px", borderRadius:"50%", background:"radial-gradient(circle,rgba(74,144,217,.08) 0%,transparent 65%)", pointerEvents:"none", animation:"orb3 9s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 1px 1px, rgba(255,255,255,.012) 1px, transparent 0)", backgroundSize:"36px 36px", pointerEvents:"none", zIndex:0 }} />

      <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", padding:"40px 32px", maxWidth:"560px" }}>
        <div style={{ marginBottom:"36px", animation:"floatF 5s ease-in-out infinite" }}>
          <div style={{ width:"64px", height:"64px", borderRadius:"18px", background:"linear-gradient(145deg,#0e1f38,#1a4f96)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 16px 48px rgba(26,79,150,.45), 0 0 0 1px rgba(74,144,217,.15)", margin:"0 auto 10px" }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"24px", color:"#fff" }}>C</span>
          </div>
          <p style={{ fontSize:"10px", color:"rgba(255,255,255,.2)", letterSpacing:"0.18em", textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif" }}>by Fortex Forge</p>
        </div>

        <div style={{ animation:"fadeUp .7s ease forwards", animationDelay:".1s", opacity:0, marginBottom:"20px" }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"clamp(28px,5vw,42px)", color:"#fff", lineHeight:"1.18", letterSpacing:"-0.03em" }}>
            Your business is real.
          </h1>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic", fontWeight:"700", fontSize:"clamp(28px,5vw,42px)", background:"linear-gradient(100deg,#4a90d9 0%,#93c5fd 45%,#4a90d9 100%)", backgroundSize:"200% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", animation:"shimmer 3.5s linear infinite", lineHeight:"1.18", letterSpacing:"-0.01em" }}>
            So why does it feel invisible?
          </h1>
        </div>

        <p style={{ fontSize:"16px", color:"rgba(255,255,255,.4)", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.7", maxWidth:"360px", marginBottom:"24px", animation:"fadeUp .7s ease forwards", animationDelay:".2s", opacity:0 }}>
          Talk to Clavex. Get an honest answer in minutes.
        </p>

        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"36px", animation:"fadeUp .7s ease forwards", animationDelay:".26s", opacity:0 }}>
          <div style={{ display:"flex", alignItems:"center" }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ width:"22px", height:"22px", borderRadius:"50%", background:`linear-gradient(145deg,${["#1a4f96","#0e2a4a","#2563eb","#14b8a6"][i]},${["#2563eb","#1a4f96","#4a90d9","#0ea5e9"][i]})`, border:"2px solid #04080f", marginLeft:i>0?"-6px":"0", fontSize:"9px", color:"#fff", fontFamily:"'DM Sans',sans-serif", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center" }}>{["S","A","M","K"][i]}</div>
            ))}
          </div>
          <p style={{ fontSize:"12.5px", color:"rgba(255,255,255,.25)", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.02em" }}>
            <span style={{ color:"rgba(255,255,255,.45)", fontWeight:"600" }}>200+</span> brands diagnosed
          </p>
        </div>

        <div style={{ animation:"fadeUp .7s ease forwards", animationDelay:".32s", opacity:0 }}>
          <button
            onClick={onEnter}
            id="cta-start-chat"
            aria-label="Start your conversation with Clavex"
            style={{ padding:"16px 40px", background:"linear-gradient(145deg,#0e2a4a,#1648a0)", border:"1px solid rgba(74,144,217,.35)", borderRadius:"14px", color:"#fff", fontSize:"15px", fontWeight:"600", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.03em", boxShadow:"0 10px 32px rgba(22,72,160,.5)", cursor:"pointer", transition:"all .28s ease" }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 16px 40px rgba(22,72,160,.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 10px 32px rgba(22,72,160,.5)"; }}
          >
            Talk to Clavex
          </button>
          <p style={{ fontSize:"12px", color:"rgba(255,255,255,.18)", marginTop:"14px", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.04em" }}>Free. No sign-up. No pitch.</p>
        </div>
      </div>

      <div style={{ position:"fixed", bottom:"24px", left:0, right:0, display:"flex", justifyContent:"center", animation:"fadeIn 1s ease forwards", animationDelay:".5s", opacity:0 }}>
        <p style={{ fontSize:"11px", color:"rgba(255,255,255,.12)", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.1em", textTransform:"uppercase" }}>Clavex by Fortex Forge · Forging Absolute Clarity</p>
      </div>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({ result, sessionId, onRetake }) {
  const s = SERVICES[result.service] || SERVICES.brand_strategy;
  const name = result.first_name ? `, ${result.first_name}` : "";
  const [vis, setVis] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 100); }, []);

  const handleWhatsApp = () => {
    trackEvent("whatsapp_clicked", { service: result.service });
    // Mark lead as whatsapp-clicked (fire-and-forget)
    if (sessionId) {
      fetch(`/api/leads/${sessionId}?password=${encodeURIComponent("Admin1404")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp_clicked: true }),
      }).catch(() => {});
    }
  };

  // Build WhatsApp message with session link for team
  const waText = `Hi, I just used Clavex and my diagnosis says I need ${s.name}.\n\nMy situation: ${result.problem}\n\nCan we talk about how to fix this?${sessionId ? `\n\nSession: https://clavex-ai.vercel.app/intel?id=${sessionId}` : ""}`;

  const handleLinkedIn = () => {
    trackEvent("linkedin_clicked", { service: result.service });
  };

  // Build shareable text summary
  const buildResultText = () => {
    const lines = [
      `CLAVEX BRAND DIAGNOSIS`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `What You Need: ${s.name}`,
      ``,
      `"${s.tag}"`,
      ``,
      `Your Situation${name}:`,
      result.problem,
      ``,
      `What This Is Costing You:`,
      s.cost,
      ``,
      `What Changes When You Fix This:`,
      s.outcome,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Your next step — one conversation:`,
      `WhatsApp: wa.me/2347068811791`,
      `LinkedIn: linkedin.com/company/fortexforge`,
      ``,
      `Powered by Clavex — Built by Fortex Forge`,
      `Forging Absolute Clarity`,
    ];
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildResultText());
      setCopied(true);
      trackEvent("export_clicked", { method: "copy", service: result.service });
      setTimeout(() => setCopied(false), 2200);
    } catch { /* clipboard may not be available */ }
  };

  const handleDownload = () => {
    const text = buildResultText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clavex-diagnosis-${result.service.replace(/_/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    trackEvent("export_clicked", { method: "download", service: result.service });
  };

  return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", alignItems:"center", padding:"36px 24px 28px", minHeight:0, animation:vis?"resultIn .65s cubic-bezier(.22,1,.36,1) forwards":"none", opacity:0 }}>
      <div style={{ fontSize:"10.5px", color:"rgba(255,255,255,.25)", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif", marginBottom:"28px", display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{ width:"24px", height:"1px", background:"rgba(255,255,255,.1)" }}/>
        Diagnosis Complete
        <div style={{ width:"24px", height:"1px", background:"rgba(255,255,255,.1)" }}/>
      </div>

      <div style={{ width:"76px", height:"76px", borderRadius:"22px", background:`linear-gradient(145deg,${s.color}18,${s.color}35)`, border:`1px solid ${s.color}50`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"30px", marginBottom:"20px", boxShadow:`0 14px 44px ${s.color}28`, animation:"floatF 4s ease-in-out infinite" }}>{s.icon}</div>

      <p style={{ fontSize:"10.5px", color:s.color, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"'DM Sans',sans-serif", fontWeight:"600", marginBottom:"8px" }}>What you need</p>
      <h2 style={{ fontSize:"28px", fontFamily:"'Syne',sans-serif", fontWeight:"800", color:"#fff", letterSpacing:"-0.02em", marginBottom:"14px", textAlign:"center" }}>{s.name}</h2>
      <div style={{ width:"36px", height:"2px", background:`linear-gradient(90deg,transparent,${s.color},transparent)`, marginBottom:"20px", borderRadius:"2px" }} />

      <p style={{ fontSize:"15px", color:"rgba(255,255,255,.68)", fontFamily:"'DM Sans',sans-serif", fontWeight:"500", lineHeight:"1.65", textAlign:"center", maxWidth:"340px", marginBottom:"18px", fontStyle:"italic" }}>"{s.tag}"</p>

      {/* Section 1: Your Situation — Mirror */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:"14px", padding:"16px 20px", maxWidth:"390px", width:"100%", marginBottom:"14px" }}>
        <p style={{ fontSize:"10.5px", color:"rgba(255,255,255,.22)", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'DM Sans',sans-serif", marginBottom:"8px" }}>Your situation{name}</p>
        <p style={{ fontSize:"14px", color:"rgba(255,255,255,.55)", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.68" }}>{result.problem}</p>
      </div>

      {/* Section 2: What This Is Costing You — Loss Aversion */}
      <div style={{ background:"rgba(239,68,68,.04)", border:"1px solid rgba(239,68,68,.12)", borderRadius:"14px", padding:"16px 20px", maxWidth:"390px", width:"100%", marginBottom:"14px" }}>
        <p style={{ fontSize:"10.5px", color:"rgba(239,68,68,.55)", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'DM Sans',sans-serif", marginBottom:"8px", display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ fontSize:"13px" }}>⚠</span> What this is costing you
        </p>
        <p style={{ fontSize:"13.5px", color:"rgba(255,255,255,.5)", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.72" }}>{s.cost}</p>
      </div>

      {/* Section 3: What Changes — Future Pacing */}
      <div style={{ background:`linear-gradient(135deg,${s.color}08,${s.color}16)`, border:`1px solid ${s.color}22`, borderRadius:"14px", padding:"16px 20px", maxWidth:"390px", width:"100%", marginBottom:"20px" }}>
        <p style={{ fontSize:"10.5px", color:s.color, textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'DM Sans',sans-serif", fontWeight:"600", marginBottom:"8px", display:"flex", alignItems:"center", gap:"6px" }}>
          <span style={{ fontSize:"13px" }}>✦</span> What changes when you fix this
        </p>
        <p style={{ fontSize:"13.5px", color:"rgba(255,255,255,.55)", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.72" }}>{s.outcome}</p>
      </div>

      {/* Section 4: Your Next Step — CTA Bridge */}
      <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:"14px", padding:"16px 20px", maxWidth:"390px", width:"100%", marginBottom:"16px", textAlign:"center" }}>
        <p style={{ fontSize:"10.5px", color:"rgba(255,255,255,.22)", textTransform:"uppercase", letterSpacing:"0.1em", fontFamily:"'DM Sans',sans-serif", marginBottom:"8px" }}>Your next step</p>
        <p style={{ fontSize:"14px", color:"rgba(255,255,255,.52)", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.68", marginBottom:"4px" }}>
          You don't need to commit to anything right now.
        </p>
        <p style={{ fontSize:"14px", color:"rgba(255,255,255,.52)", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.68" }}>
          Just one conversation with the Fortex Forge team to see if this is worth fixing. No pitch, no pressure — just clarity.
        </p>
      </div>

      <a href={`https://wa.me/2347068811791?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"
        id="cta-whatsapp"
        onClick={handleWhatsApp}
        style={{ display:"block", width:"100%", maxWidth:"390px", padding:"16px 24px", background:"linear-gradient(145deg,#0e2a4a,#1648a0)", border:"1px solid rgba(74,144,217,.35)", borderRadius:"14px", color:"#fff", fontSize:"15px", fontWeight:"600", fontFamily:"'DM Sans',sans-serif", textAlign:"center", textDecoration:"none", boxShadow:"0 8px 30px rgba(22,72,160,.45)", transition:"all .25s ease", letterSpacing:"0.02em", marginBottom:"12px" }}
        onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 38px rgba(22,72,160,.55)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 8px 30px rgba(22,72,160,.45)"; }}
      >Start a Conversation →</a>

      {/* Export buttons */}
      <div style={{ display:"flex", gap:"10px", maxWidth:"390px", width:"100%", marginBottom:"12px" }}>
        <button onClick={handleCopy} aria-label="Copy diagnosis results" id="btn-copy-results"
          style={{ flex:1, padding:"12px 16px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:"12px", color: copied ? "#22c55e" : "rgba(255,255,255,.45)", fontSize:"13px", fontWeight:"500", fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px" }}
          onMouseEnter={e => { if(!copied){ e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="rgba(255,255,255,.7)"; }}}
          onMouseLeave={e => { if(!copied){ e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.color="rgba(255,255,255,.45)"; }}}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {copied ? "Copied!" : "Copy Results"}
        </button>
        <button onClick={handleDownload} aria-label="Download diagnosis as text file" id="btn-download-results"
          style={{ flex:1, padding:"12px 16px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:"12px", color:"rgba(255,255,255,.45)", fontSize:"13px", fontWeight:"500", fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all .2s ease", display:"flex", alignItems:"center", justifyContent:"center", gap:"7px" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="rgba(255,255,255,.7)"; }}
          onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.color="rgba(255,255,255,.45)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
      </div>

      <a href="https://www.linkedin.com/company/fortexforge" target="_blank" rel="noopener noreferrer"
        id="cta-linkedin"
        onClick={handleLinkedIn}
        style={{ fontSize:"12px", color:"rgba(255,255,255,.22)", fontFamily:"'DM Sans',sans-serif", textDecoration:"none", letterSpacing:"0.04em", marginBottom:"28px", transition:"color .2s" }}
        onMouseEnter={e => e.currentTarget.style.color="rgba(255,255,255,.45)"}
        onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,.22)"}
      >or connect on LinkedIn</a>

      <button onClick={onRetake} aria-label="Start over" id="btn-start-over"
        style={{ background:"none", border:"none", color:"rgba(255,255,255,.16)", fontSize:"11.5px", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.08em", cursor:"pointer", textTransform:"uppercase", transition:"color .2s" }}
        onMouseEnter={e => e.currentTarget.style.color="rgba(255,255,255,.38)"}
        onMouseLeave={e => e.currentTarget.style.color="rgba(255,255,255,.16)"}
      >Start over</button>
    </div>
  );
}

// ─── CHAT WORLD ───────────────────────────────────────────────────────────────
function ChatWorld({ entering, onReturnHome }) {
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showFAQ, setShowFAQ] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [result, setResult] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [restored, setRestored] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const taRef = useRef(null);
  const history = useRef([]);

  // ── LEAD CAPTURE (fire-and-forget on diagnosis complete) ───────────
  const captureLead = useCallback(async (conversation, parsedResult) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation, result: parsedResult }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session_id) setSessionId(data.session_id);
      }
    } catch (_) {} // silent — never block the user
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, streamingContent, loading]);

  // ── SESSION RESTORE ──────────────────────────────────────────────────────
  useEffect(() => {
    const saved = loadSession();
    if (saved && saved.messages && saved.messages.length > 0) {
      setMessages(saved.messages);
      history.current = saved.history || [];
      if (saved.result) setResult(saved.result);
      setLoading(false);
      setRestored(true);
      trackEvent("session_restored");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Fresh session — show greeting with natural typing delay
      const OPENERS = [
        "Hey, welcome. Tell me about your brand. What do you do and who do you do it for?",
        "Hey there. Before I can help you, I need to understand your brand. What does your business do?",
        "Welcome. I'd love to understand your brand first. What's your business about and who are you trying to reach?",
        "Hey. Let's start simple. Tell me about your business. What do you do and how long have you been at it?",
      ];
      const OPENER = OPENERS[Math.floor(Math.random() * OPENERS.length)];
      trackEvent("chat_started");
      setTimeout(() => {
        const greeting = { role: "assistant", content: OPENER };
        history.current = [{ role: "user", content: "Hi" }, greeting];
        setMessages([greeting]);
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1500);
    }
  }, []);

  // ── SAVE SESSION on changes ────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      saveSession(messages, history.current, result);
    }
  }, [messages, result]);

  const tryParseResult = (text) => {
    try {
      const match = text.match(/\{[\s\S]*?"result"\s*:\s*true[\s\S]*?\}/);
      if (match) { const p = JSON.parse(match[0]); if (p.result && p.service && SERVICES[p.service]) return p; }
    } catch(_) {}
    return null;
  };

  // ── STREAMING CALL (via backend proxy) ─────────────────────────────────
  const streamAI = async (msgs) => {
    setIsStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        // Backend returns JSON errors for non-streaming responses
        let errMsg = "Something went wrong. Please try again.";
        try {
          const errBody = await res.json();
          if (errBody.error) errMsg = errBody.error;
          if (errBody.message) errMsg = errBody.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      let fullText = "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            const data = line.trim().slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                fullText += parsed.choices[0].delta.content;
                setStreamingContent(fullText);
              }
            } catch(_) {}
          }
        }
      }

      setIsStreaming(false);
      setStreamingContent("");
      return fullText;
    } catch (err) {
      clearTimeout(timeout);
      setIsStreaming(false);
      setStreamingContent("");
      const msg = err.name === "AbortError"
        ? "The connection timed out. Please check your internet and try again."
        : err.message || "Something went wrong. Please check your connection and try again.";
      throw new Error(msg);
    }
  };

  const [lastFailedText, setLastFailedText] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const send = async (text) => {
    if (!text.trim() || loading || isStreaming) return;
    if (text.trim().length > MAX_MESSAGE_LENGTH) return;

    const um = { role:"user", content:text.trim() };
    history.current.push(um);
    const updated = [...messages, um];
    setMessages(updated);
    setInput("");
    setLastFailedText(null);
    setErrorMsg(null);
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);

    trackEvent("message_sent");

    try {
      const reply = await streamAI([...history.current]);
      history.current.push({ role:"assistant", content:reply });

      const parsed = tryParseResult(reply);
      if (parsed) {
        setResult(parsed);
        setLoading(false);
        trackEvent("diagnosis_complete", { service: parsed.service });
        trackEvent("service_diagnosed", { service: parsed.service });
        // Capture lead data silently in the background
        captureLead([...history.current], parsed);
        return;
      }

      setMessages([...updated, { role:"assistant", content:reply }]);
      setLoading(false);
      inputRef.current?.focus();
    } catch (err) {
      // Remove the failed user message from history and visible messages
      history.current.pop();
      setMessages(messages); // restore to state before the user message was added
      setLastFailedText(text.trim());
      setErrorMsg(err.message);
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const retry = () => {
    if (lastFailedText) {
      setErrorMsg(null);
      setLastFailedText(null);
      send(lastFailedText);
    }
  };

  const pickFAQ = (question, ans) => {
    const qm = { role:"user", content:question };
    const am = { role:"assistant", content:ans };
    history.current.push(qm, am);
    setMessages(p => [...p, qm, am]);
    setShowFAQ(false); setFaqSearch("");
    trackEvent("faq_used");
  };

  const handleReturnHome = () => {
    clearSession();
    onReturnHome();
  };

  const filteredFAQ = FAQ.filter(f => f.q.toLowerCase().includes(faqSearch.toLowerCase()));
  const isBusy = loading || isStreaming;
  const charCount = input.length;
  const charWarning = charCount > MAX_MESSAGE_LENGTH * 0.8;
  const charOver = charCount > MAX_MESSAGE_LENGTH;

  return (
    <div style={{ position:"fixed", inset:0, background:"#070d18", display:"flex", flexDirection:"column", alignItems:"center", zIndex:5, animation:entering?"worldIn .55s cubic-bezier(.22,1,.36,1) forwards":"none" }}>
      <div style={{ position:"fixed", top:"-12%", right:"-4%", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle,rgba(14,47,96,.45) 0%,transparent 65%)", pointerEvents:"none", animation:"orb1 9s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:"-18%", left:"-6%", width:"360px", height:"360px", borderRadius:"50%", background:"radial-gradient(circle,rgba(20,60,130,.22) 0%,transparent 65%)", pointerEvents:"none", animation:"orb2 12s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"fixed", inset:0, backgroundImage:"radial-gradient(circle at 1px 1px,rgba(255,255,255,.015) 1px,transparent 0)", backgroundSize:"32px 32px", pointerEvents:"none", zIndex:0 }} />

      <div style={{ width:"100%", maxWidth:"660px", height:"100%", display:"flex", flexDirection:"column", position:"relative", zIndex:1 }}>

        {/* Header */}
        <header style={{ padding:"13px 20px", borderBottom:"1px solid rgba(255,255,255,.055)", background:"rgba(7,13,24,.9)", backdropFilter:"blur(24px)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"11px" }}>
            <div style={{ width:"36px", height:"36px", borderRadius:"10px", background:"linear-gradient(145deg,#0e1f38,#1a4f96)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(26,79,150,.35)" }}>
              <span style={{ fontSize:"14px", fontFamily:"'Syne',sans-serif", fontWeight:"800", color:"#fff" }}>C</span>
            </div>
            <div>
              <div style={{ fontSize:"14px", fontWeight:"700", color:"#fff", fontFamily:"'Syne',sans-serif", letterSpacing:"0.04em" }}>CLAVEX</div>
              <div style={{ fontSize:"10px", color:"#4a90d9", fontWeight:"500", letterSpacing:"0.1em", textTransform:"uppercase" }}>
                {result ? "Diagnosis Complete" : isStreaming ? "Thinking..." : restored && messages.length > 1 ? "Session Restored" : "Brand Strategist"}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:isStreaming?"#f59e0b":"#22c55e", boxShadow:`0 0 7px ${isStreaming?"#f59e0b":"#22c55e"}`, animation:"pulse 2s ease-in-out infinite" }} />
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,.3)", letterSpacing:"0.06em" }}>{isStreaming ? "Responding" : "Online"}</span>
            </div>
            <button onClick={handleReturnHome} aria-label="Return to home" id="btn-home"
              style={{ padding:"6px 13px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", borderRadius:"8px", color:"rgba(255,255,255,.38)", fontSize:"12px", fontFamily:"'DM Sans',sans-serif", fontWeight:"500", display:"flex", alignItems:"center", gap:"5px", transition:"all .2s ease", cursor:"pointer" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,.08)"; e.currentTarget.style.color="rgba(255,255,255,.7)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.04)"; e.currentTarget.style.color="rgba(255,255,255,.38)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Home
            </button>
          </div>
        </header>

        {result ? (
          <ResultScreen result={result} sessionId={sessionId} onRetake={handleReturnHome} />
        ) : (
          <>
            <main aria-label="Conversation with Clavex" id="main-content" style={{ flex:1, overflowY:"auto", padding:"24px 18px 8px", display:"flex", flexDirection:"column", minHeight:0 }}>
              {/* Settled messages */}
              {messages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} isNew={false} isStreaming={false} />
              ))}

              {/* Streaming message — appears live as text arrives */}
              {isStreaming && streamingContent && (
                <div style={{ display:"flex", justifyContent:"flex-start", marginBottom:"16px", animation:"msgIn .38s cubic-bezier(.34,1.56,.64,1) forwards" }}>
                  <div style={{ marginRight:"10px", marginTop:"2px" }}><ClavexAvatar size={32}/></div>
                  <div style={{ maxWidth:"76%", padding:"13px 17px", borderRadius:"5px 16px 16px 16px", background:"rgba(255,255,255,0.045)", border:"1px solid rgba(255,255,255,0.07)", fontSize:"14.5px", lineHeight:"1.72", color:"#c8dcf5", fontFamily:"'DM Sans',sans-serif", whiteSpace:"pre-wrap" }}>
                    {streamingContent}
                    <span style={{ display:"inline-block", width:"2px", height:"14px", background:"#4a90d9", marginLeft:"2px", verticalAlign:"middle", animation:"blink .7s ease-in-out infinite" }} />
                  </div>
                </div>
              )}

              {/* Initial loading dots — only when no stream content yet */}
              {loading && !isStreaming && (
                <div style={{ display:"flex", alignItems:"flex-start", marginBottom:"14px" }} aria-live="polite" aria-label="Clavex is typing">
                  <div style={{ marginRight:"10px" }}><ClavexAvatar size={32}/></div>
                  <TypingDots />
                </div>
              )}

              {/* Error + retry */}
              {errorMsg && !loading && !isStreaming && (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", marginBottom:"14px", animation:"fadeUp .25s ease forwards" }}>
                  <p style={{ fontSize:"13px", color:"#f87171", fontFamily:"'DM Sans',sans-serif", textAlign:"center", lineHeight:"1.5" }}>{errorMsg}</p>
                  <button onClick={retry} aria-label="Retry last message" id="btn-retry"
                    style={{ padding:"8px 18px", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:"10px", color:"#f87171", fontSize:"13px", fontFamily:"'DM Sans',sans-serif", fontWeight:"500", cursor:"pointer", transition:"all .2s ease", display:"flex", alignItems:"center", gap:"6px" }}
                    onMouseEnter={e => { e.currentTarget.style.background="rgba(239,68,68,.18)"; e.currentTarget.style.borderColor="rgba(239,68,68,.4)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="rgba(239,68,68,.1)"; e.currentTarget.style.borderColor="rgba(239,68,68,.25)"; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                    Tap to retry
                  </button>
                </div>
              )}

              <div ref={bottomRef} style={{ height:"4px" }} />
            </main>

            {/* FAQ */}
            {showFAQ && (
              <div role="region" aria-label="Frequently asked questions" style={{ margin:"0 14px 8px", background:"#0b1826", border:"1px solid rgba(74,144,217,.16)", borderRadius:"16px", padding:"15px", maxHeight:"250px", overflowY:"auto", flexShrink:0, animation:"fadeUp .25s ease forwards" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"11px" }}>
                  <span style={{ fontSize:"10.5px", fontWeight:"600", color:"#4a90d9", letterSpacing:"0.12em", textTransform:"uppercase" }}>Quick answers</span>
                  <button onClick={() => { setShowFAQ(false); setFaqSearch(""); }} aria-label="Close FAQ" style={{ background:"none", border:"none", color:"rgba(255,255,255,.3)", fontSize:"20px", lineHeight:1, cursor:"pointer", padding:"0 2px" }}>×</button>
                </div>
                <input value={faqSearch} onChange={e => setFaqSearch(e.target.value)} placeholder="Search..." aria-label="Search FAQs" style={{ width:"100%", padding:"8px 12px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", borderRadius:"8px", color:"#fff", fontSize:"13px", fontFamily:"'DM Sans',sans-serif", marginBottom:"10px" }} />
                {filteredFAQ.length > 0 ? filteredFAQ.map((f,i) => (
                  <button key={i} onClick={() => pickFAQ(f.q, f.a)} aria-label={`Get answer: ${f.q}`}
                    style={{ display:"block", width:"100%", textAlign:"left", padding:"9px 13px", marginBottom:"5px", background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", borderRadius:"9px", color:"rgba(255,255,255,.55)", fontSize:"13px", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.5", cursor:"pointer", transition:"all .18s ease" }}
                    onMouseEnter={e => { e.currentTarget.style.background="rgba(74,144,217,.08)"; e.currentTarget.style.color="#93c5fd"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,.03)"; e.currentTarget.style.color="rgba(255,255,255,.55)"; }}
                  >{f.q}</button>
                )) : <p style={{ fontSize:"13px", color:"rgba(255,255,255,.25)", textAlign:"center", padding:"8px 0", fontStyle:"italic" }}>No match. Just type your question below.</p>}
              </div>
            )}

            {/* Input */}
            <div style={{ padding:"10px 14px 20px", background:"rgba(7,13,24,.92)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
              <div style={{ display:"flex", gap:"8px", alignItems:"flex-end" }}>
                <button onClick={() => setShowFAQ(v=>!v)} aria-label={showFAQ?"Close FAQ":"Open FAQ"} aria-expanded={showFAQ} id="btn-faq"
                  style={{ width:"44px", height:"44px", borderRadius:"12px", flexShrink:0, background:showFAQ?"rgba(74,144,217,.14)":"rgba(255,255,255,.04)", border:`1px solid ${showFAQ?"rgba(74,144,217,.35)":"rgba(255,255,255,.07)"}`, color:showFAQ?"#4a90d9":"rgba(255,255,255,.35)", fontSize:"17px", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s ease", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>?</button>

                <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                  <div style={{ display:"flex", alignItems:"flex-end", background:"rgba(255,255,255,.04)", border:`1px solid ${charOver ? "rgba(239,68,68,.4)" : "rgba(255,255,255,.08)"}`, borderRadius:"14px", padding:"10px 14px", transition:"border-color .2s ease" }}>
                    <textarea
                      ref={el => { inputRef.current=el; taRef.current=el; }}
                      value={input}
                      onChange={e => { setInput(e.target.value); e.target.style.height="auto"; e.target.style.height=Math.min(e.target.scrollHeight,100)+"px"; }}
                      onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(input); }}}
                      placeholder={isBusy ? "Clavex is responding..." : "Say something..."}
                      disabled={isBusy}
                      aria-label="Type your message to Clavex"
                      rows={1}
                      style={{ flex:1, background:"none", border:"none", color:isBusy?"rgba(255,255,255,.3)":"#ddeeff", fontSize:"14.5px", fontFamily:"'DM Sans',sans-serif", lineHeight:"1.55", maxHeight:"100px", overflowY:"auto", minHeight:"22px", cursor:isBusy?"not-allowed":"text" }}
                    />
                  </div>
                  {/* Character counter */}
                  {charCount > 0 && (
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:"4px", paddingRight:"4px" }}>
                      <span style={{
                        fontSize:"10.5px",
                        fontFamily:"'DM Sans',sans-serif",
                        letterSpacing:"0.04em",
                        color: charOver ? "#f87171" : charWarning ? "#f59e0b" : "rgba(255,255,255,.18)",
                        transition:"color .2s ease",
                      }}>
                        {charCount}/{MAX_MESSAGE_LENGTH}
                      </span>
                    </div>
                  )}
                </div>

                <button onClick={() => send(input)} disabled={!input.trim()||isBusy||charOver} aria-label="Send message" id="btn-send"
                  style={{ width:"44px", height:"44px", borderRadius:"12px", flexShrink:0, background:input.trim()&&!isBusy&&!charOver?"linear-gradient(145deg,#0e2a4a,#1648a0)":"rgba(255,255,255,.04)", border:`1px solid ${input.trim()&&!isBusy&&!charOver?"rgba(74,144,217,.3)":"rgba(255,255,255,.06)"}`, color:input.trim()&&!isBusy&&!charOver?"#fff":"rgba(255,255,255,.18)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s ease", cursor:input.trim()&&!isBusy&&!charOver?"pointer":"not-allowed", boxShadow:input.trim()&&!isBusy&&!charOver?"0 4px 20px rgba(22,72,160,.4)":"none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
              <p style={{ fontSize:"11px", color:"rgba(255,255,255,.13)", textAlign:"center", marginTop:"10px", letterSpacing:"0.05em", fontFamily:"'DM Sans',sans-serif" }}>Clavex · Built by Fortex Forge</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [world, setWorld] = useState("landing");
  const [landingExiting, setLandingExiting] = useState(false);
  const [chatEntering, setChatEntering] = useState(false);

  // Check if we're on the /intel route
  const isIntelRoute = window.location.pathname === "/intel";

  const enterChat = () => {
    trackEvent("chat_started");
    setLandingExiting(true);
    setTimeout(() => {
      setWorld("chat");
      setChatEntering(true);
      setTimeout(() => setChatEntering(false), 600);
    }, 550);
  };

  const returnHome = () => {
    clearSession();
    setWorld("landing");
    setLandingExiting(false);
  };

  // If /intel route, render the dashboard
  if (isIntelRoute) {
    return (
      <>
        <style>{GLOBAL_STYLES}</style>
        <IntelDashboard />
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      {world === "landing" && <LandingPage onEnter={enterChat} exiting={landingExiting} />}
      {world === "chat" && <ChatWorld entering={chatEntering} onReturnHome={returnHome} />}
    </>
  );
}
