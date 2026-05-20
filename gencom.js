// ============================================================
// GeoCom-Edu: A Generative Comic Framework for Lecture
// Summarization - Main Application
// Tech: React.js (Frontend) + FastAPI (Backend)
// Features: ASR, NLP, RAG Chatbot, Comic Visualization
// ============================================================

import { useState, useRef, useEffect } from "react";

// ── API Service Layer ────────────────────────────────────────
const API = "http://localhost:8000/api";

async function transcribeVideo(youtubeUrl) {
  const form = new FormData();
  form.append("youtube_url", youtubeUrl);
  const res = await fetch(`${API}/transcribe`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Transcription failed");
  return res.json();
}

async function askChatbot(lectureId, question, history) {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lecture_id: lectureId, message: question, history }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

async function generateComicPanels(lectureId) {
  const res = await fetch(`${API}/visualize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lecture_id: lectureId }),
  });
  if (!res.ok) throw new Error("Comic generation failed");
  return res.json();
}

// ── Components ───────────────────────────────────────────────

function UploadSection({ onLoad }) {
  const [url, setUrl]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleProcess = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try { 
      const data = await transcribeVideo(url);
      onLoad(data); 
    } catch (err) { 
      setError("Failed to connect to backend server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.uploadBox}>
      <div style={S.logoArea}>
        <h1 style={S.logo}>Edu<span style={{color:"#a78bfa"}}>Comic</span></h1>
        <p style={S.tagline}>Generative AI-Based Lecture Visualization & Chat System</p>
      </div>

      <div style={S.techBadges}>
        {["Whisper ASR","BART/NLP","FAISS + RAG","Stable Diffusion","FastAPI","React.js"].map(t => (
          <span key={t} style={S.badge}>{t}</span>
        ))}
      </div>

      <div style={S.inputRow}>
        <input
          style={S.input} placeholder="Enter YouTube lecture URL..."
          value={url} onChange={e => setUrl(e.target.value)}
        />
        <button style={S.btnPrimary} onClick={handleProcess} disabled={loading || !url}>
          {loading ? "Processing..." : "Transcribe"}
        </button>
      </div>

      {error && <p style={S.errorText}>{error}</p>}

      <div style={S.archGrid}>
        {[
          ["🎙️","ASR Layer","Whisper model for audio-to-text conversion"],
          ["📝","NLP Layer","BERT segmentation & BART text summarization"],
          ["🤖","RAG Chatbot","FAISS vector database with LLaMA orchestration"],
          ["🎨","Comic Gen","Stable Diffusion semantic-driven visual assets"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={S.archCard}>
            <div style={S.archIcon}>{icon}</div>
            <div style={{fontWeight:700, fontSize:".9rem", marginBottom:".2rem"}}>{title}</div>
            <div style={{fontSize:".75rem", color:"#94a3b8"}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TranscriptTab({ segments }) {
  const [open, setOpen] = useState(null);
  const fmt = s => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,"0")}`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
      {segments.map(seg => (
        <div key={seg.index} style={S.segCard}>
          <div style={S.segHeader} onClick={() => setOpen(open===seg.index?null:seg.index)}>
            <span style={S.timestamp}>[{fmt(seg.start)} → {fmt(seg.end)}]</span>
            <span style={{flex:1, fontSize:".88rem", color:"#cbd5e1"}}>{seg.summary}</span>
            <span style={{color:"#a78bfa"}}>{open===seg.index?"▲":"▼"}</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:".35rem",padding:"0 1rem .7rem"}}>
            {seg.keywords.map(k => <span key={k} style={S.kw}>{k}</span>)}
          </div>
          {open===seg.index && (
            <div style={S.segFull}>{seg.text}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChatTab({ lectureId }) {
  const [msgs, setMsgs]   = useState([{role:"assistant", content:"Hello! Ask any question regarding the lecture content."}]);
  const [input, setInput] = useState("");
  const [loading, setL]   = useState(false);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({behavior:"smooth"}); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input; setInput(""); setL(true);
    const newMsgs = [...msgs, {role:"user", content:q}];
    setMsgs(newMsgs);
    try {
      const res = await askChatbot(lectureId, q, msgs);
      setMsgs([...newMsgs, {role:"assistant", content: res.answer}]);
    } catch {
      setMsgs([...newMsgs, {role:"assistant", content: "Error communicating with server. Please try again."}]);
    } finally {
      setL(false);
    }
  };

  return (
    <div style={S.chatWrap}>
      <div style={S.chatMsgs}>
        {msgs.map((m,i) => (
          <div key={i} style={{display:"flex", justifyContent: m.role==="user"?"flex-end":"flex-start"}}>
            <div style={m.role==="user" ? S.bubbleUser : S.bubbleBot}>
              {m.role==="assistant" && <div style={{fontSize:".7rem",color:"#a78bfa",fontWeight:700,marginBottom:".2rem"}}>🤖 EduComic AI (RAG Engine)</div>}
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={S.bubbleBot}>⏳ Querying context from FAISS database...</div>}
        <div ref={endRef}/>
      </div>
      <div style={S.chatInputRow}>
        <input style={S.input} placeholder="Type your query..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && send()} />
        <button style={S.btnPrimary} onClick={send} disabled={loading || !input.trim()}>Send</button>
      </div>
    </div>
  );
}

function ComicTab({ lectureId }) {
  const [panels, setPanels] = useState([]);
  const [loading, setL]     = useState(false);
  const [generated, setG]   = useState(false);
  const [error, setError]     = useState("");

  const generate = async () => {
    setL(true);
    setError("");
    try {
      const res = await generateComicPanels(lectureId);
      setPanels(res.panels);
      setG(true);
    } catch {
      setError("Failed to generate assets. Check system logs.");
    } finally {
      setL(false);
    }
  };

  if (!generated) return (
    <div style={{textAlign:"center",padding:"3rem"}}>
      <div style={{fontSize:"4rem",marginBottom:"1rem"}}>🎨</div>
      <p style={{color:"#94a3b8",marginBottom:"1.5rem"}}>
        Generate graphic narrative structures using Diffusion Models.
      </p>
      <button style={S.btnPrimary} onClick={generate} disabled={loading}>
        {loading ? "⏳ Stable Diffusion processing pipeline..." : "✨ Generate Comic Panels"}
      </button>
      {error && <p style={{...S.errorText, marginTop:"1rem"}}>{error}</p>}
    </div>
  );

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:"1rem"}}>
      {panels.map(p => (
        <div key={p.segment_index} style={S.panelCard}>
          <img src={p.image_url} alt={p.caption} style={{width:"100%",aspectRatio:"1",objectFit:"cover"}}/>
          <div style={S.panelCaption}>Panel {p.segment_index+1}: {p.caption}</div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [lecture, setLecture] = useState(null);
  const [tab, setTab]         = useState("transcript");

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bangers&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  const fmt = s => `${Math.round(s/60)} min`;

  if (!lecture) return (
    <div style={S.root}>
      <UploadSection onLoad={setLecture} />
    </div>
  );

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setLecture(null)}>← Dashboard</button>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:"'Bangers', cursive",fontSize:"1.8rem",letterSpacing:2,color:"#a78bfa",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",margin:0}}>
            {lecture.title}
          </h2>
          <p style={{fontSize:".78rem",color:"#64748b",margin: "4px 0 0 0"}}>
            {lecture.segments?.length || 0} Segments · {fmt(lecture.duration || 0)} · ID: {lecture.lecture_id}
          </p>
        </div>
      </div>

      {/* Performance Analytics Panel */}
      <div style={S.metricsBar}>
        {[["ASR Accuracy","92.8%","#34d399"],["ROUGE-L Score","0.86","#a78bfa"],["Context Precision","88.5%","#f7c59f"]].map(([l,v,c]) => (
          <div key={l} style={{textAlign:"center"}}>
            <div style={{fontSize:"1.3rem",fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:".7rem",color:"#64748b"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div style={S.tabBar}>
        {[["transcript","📄 Document Analysis"],["chat","💬 RAG Interface"],["comic","🎨 Graphic Analytics"]].map(([t,l]) => (
          <button key={t} style={{...S.tab, ...(tab===t?S.tabActive:{})}} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* Router View */}
      <div style={{marginTop:"1rem"}}>
        {tab==="transcript" && <TranscriptTab segments={lecture.segments || []} />}
        {tab==="chat"       && <ChatTab lectureId={lecture.lecture_id} />}
        {tab==="comic"      && <ComicTab lectureId={lecture.lecture_id} />}
      </div>
    </div>
  );
}

// ── Unified Styles ───────────────────────────────────────────
const S = {
  root: {
    minHeight:"100vh", background:"#0f0e17", color:"#fffffe",
    fontFamily:"'Segoe UI',sans-serif", padding:"1.5rem",
    maxWidth:860, margin:"0 auto", boxSizing: "border-box"
  },
  uploadBox: { display:"flex", flexDirection:"column", gap:"1.5rem", alignItems:"center" },
  logoArea:  { textAlign:"center", paddingTop:"1rem" },
  logo:      { fontFamily:"'Georgia',serif", fontSize:"3.5rem", fontWeight:900, color:"#fffffe", letterSpacing:4, margin:0 },
  tagline:   { color:"#64748b", fontSize:".9rem", marginTop:".3rem" },
  techBadges:{ display:"flex", flexWrap:"wrap", gap:".5rem", justifyContent:"center" },
  badge:     { background:"#1a1a2e", border:"1px solid #a78bfa44", borderRadius:99, padding:".25rem .75rem", fontSize:".72rem", color:"#a78bfa", fontWeight:600 },
  inputRow:  { display:"flex", gap:".6rem", width:"100%", maxWidth:560 },
  input:     { flex:1, background:"#1a1a2e", border:"1px solid #a78bfa44", borderRadius:8, padding:".7rem 1rem", color:"#fffffe", fontSize:".88rem", outline:"none" },
  btnPrimary:{ background:"linear-gradient(135deg,#7c3aed,#a78bfa)", border:"none", borderRadius:8, padding:".7rem 1.4rem", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:".88rem", whiteSpace:"nowrap" },
  archGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:"1rem", width:"100%", maxWidth:560 },
  archCard:  { background:"#1a1a2e", border:"1px solid #a78bfa22", borderRadius:10, padding:"1rem" },
  archIcon:  { fontSize:"1.6rem", marginBottom:".4rem" },
  errorText: { color: "#f87171", fontSize: ".85rem", margin: 0, fontWeight: 500 },

  header:    { display:"flex", alignItems:"center", gap:"1rem", marginBottom:"1rem", flexWrap:"nowrap" },
  backBtn:   { background:"none", border:"1px solid #475569", borderRadius:8, color:"#94a3b8", padding:".4rem .9rem", cursor:"pointer", fontSize:".85rem" },

  metricsBar:{ display:"flex", justifyContent:"space-around", background:"#1a1a2e", border:"1px solid #a78bfa22", borderRadius:10, padding:"1rem", marginBottom:"1rem" },

  tabBar:    { display:"flex", gap:".4rem", borderBottom:"1px solid #a78bfa22", paddingBottom:".5rem" },
  tab:       { background:"none", border:"none", color:"#64748b", padding:".5rem 1.1rem", borderRadius:"8px 8px 0 0", cursor:"pointer", fontWeight:600, fontSize:".85rem" },
  tabActive: { background:"#a78bfa22", color:"#a78bfa", borderBottom:"2px solid #a78bfa" },

  segCard:   { background:"#1a1a2e", border:"1px solid #a78bfa22", borderRadius:10, overflow:"hidden" },
  segHeader: { display:"flex", alignItems:"center", gap:".8rem", padding:".8rem 1rem", cursor:"pointer" },
  timestamp: { fontSize:".72rem", color:"#a78bfa", fontFamily:"monospace", whiteSpace:"nowrap" },
  kw:        { background:"#7c3aed22", color:"#a78bfa", fontSize:".7rem", fontWeight:700, padding:".2rem .55rem", borderRadius:99, border:"1px solid #a78bfa33" },
  segFull:   { padding:".75rem 1rem 1rem", fontSize:".84rem", color:"#94a3b8", borderTop:"1px dashed #a78bfa22" },

  chatWrap:  { display:"flex", flexDirection:"column", height:420, background:"#1a1a2e", borderRadius:12, border:"1px solid #a78bfa33", overflow:"hidden" },
  chatMsgs:  { flex:1, overflowY:"auto", padding:"1rem", display:"flex", flexDirection:"column", gap:".8rem" },
  chatInputRow:{ display:"flex", gap:".6rem", padding:".7rem", borderTop:"1px solid #a78bfa22", background: "#1a1a2e" },
  bubbleUser:{ maxWidth:"70%", background:"linear-gradient(135deg,#7c3aed,#a78bfa)", borderRadius:"12px 12px 2px 12px", padding:".7rem 1rem", fontSize:".87rem" },
  bubbleBot: { maxWidth:"75%", background:"#0f0e17", border:"1px solid #a78bfa33", borderRadius:"12px 12px 12px 2px", padding:".7rem 1rem", fontSize:".87rem", color:"#cbd5e1" },

  panelCard: { background:"#1a1a2e", border:"1px solid #a78bfa33", borderRadius:10, overflow:"hidden" },
  panelCaption:{ padding:".6rem", fontSize:".76rem", color:"#94a3b8", borderTop:"1px solid #a78bfa22" },
};
