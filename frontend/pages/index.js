import { useState, useRef, useEffect, useCallback } from 'react';
import Head from 'next/head';
import axios from 'axios';
import dynamic from 'next/dynamic';

// Dynamically imported — react-simple-maps uses browser APIs not available in SSR
const AudienceMap = dynamic(() => import('../components/AudienceMap'), { ssr: false });

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconUploadCloud = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);
const IconBulb = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="3"/><path d="M12 6a6 6 0 0 1 6 6c0 2.4-1.4 4.5-3.4 5.6L13 21H11l-1.6-3.4A6 6 0 0 1 6 12a6 6 0 0 1 6-6z"/>
  </svg>
);
const IconBar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconFire = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
);
const IconGlobe = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
const IconTrend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconClock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`toast-anim fixed top-5 right-5 z-50 flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-2xl max-w-sm text-sm ${type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'}`}
      style={{ backdropFilter: 'blur(16px)' }}>
      {type === 'success'
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      }
      <span className="flex-1 leading-snug">{message}</span>
      <button onClick={onClose} className="text-white/60 hover:text-white text-lg leading-none ml-1">×</button>
    </div>
  );
}

// ─── LoadingDots ─────────────────────────────────────────────────────────────
function LoadingDots() {
  return <div className="dot-bounce flex items-center gap-0.5 py-1"><span/><span/><span/></div>;
}

// ─── ChartRenderer (UNCHANGED) ───────────────────────────────────────────────
function ChartRenderer({ chartConfig, rows }) {
  const { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = require('recharts');
  const COLORS = ['#6366f1','#14b8a6','#8b5cf6','#f59e0b','#ef4444','#ec4899'];
  const { chart_type, x_axis, y_axis } = chartConfig;
  if (!rows || rows.length === 0) return <p className="text-slate-500 text-sm italic text-center py-8">No data returned for this query.</p>;
  const commonProps = { data: rows, margin: { top: 10, right: 20, left: -10, bottom: 60 } };
  const xTickProps = { tick: { fill: '#64748b', fontSize: 11 }, angle: -35, textAnchor: 'end', interval: 'preserveStartEnd' };
  const yTickProps = { tick: { fill: '#64748b', fontSize: 11 } };
  const tooltipStyle = { contentStyle: { background: '#111827', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 12 }, labelStyle: { color: '#e2e8f0' } };

  if (chart_type === 'table') {
    const cols = Object.keys(rows[0]);
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {cols.map(c => <th key={c} className="text-left px-4 py-3 text-xs font-semibold text-indigo-300 uppercase tracking-wider whitespace-nowrap">{c.replace(/_/g,' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {cols.map(c => <td key={c} className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{String(r[c]??'—')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (chart_type === 'pie') {
    const pieData = rows.map(r => ({ name: r[x_axis], value: Number(r[y_axis])||0 }));
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
            {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
          </Pie>
          <Tooltip {...tooltipStyle}/>
        </PieChart>
      </ResponsiveContainer>
    );
  }
  if (chart_type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
          <XAxis dataKey={x_axis} {...xTickProps}/><YAxis {...yTickProps}/>
          <Tooltip {...tooltipStyle}/><Legend wrapperStyle={{fontSize:12,color:'#64748b',paddingTop:16}}/>
          <Line type="monotone" dataKey={y_axis} stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{r:5,fill:'#6366f1'}}/>
        </LineChart>
      </ResponsiveContainer>
    );
  }
  if (chart_type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{top:10,right:20,bottom:60,left:-10}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
          <XAxis dataKey={x_axis} name={x_axis} {...xTickProps}/><YAxis dataKey={y_axis} name={y_axis} {...yTickProps}/>
          <Tooltip cursor={{strokeDasharray:'3 3'}} {...tooltipStyle}/>
          <Scatter data={rows} fill="#6366f1" fillOpacity={0.75}/>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
        <XAxis dataKey={x_axis} {...xTickProps}/><YAxis {...yTickProps}/>
        <Tooltip {...tooltipStyle}/>
        <Bar dataKey={y_axis} fill="#6366f1" radius={[4,4,0,0]}>
          {rows.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Placeholder mini charts ─────────────────────────────────────────────────
function MiniSparkline({ values = [] }) {
  if (!values.length) {
    return <p className="text-xs text-slate-500 italic">No monthly trend data available</p>;
  }

  const width = 340;
  const height = 80;
  const padX = 20;
  const padY = 12;
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = Math.max(maxVal - minVal, 1);
  const step = values.length > 1 ? (width - padX * 2) / (values.length - 1) : 0;

  const pointList = values.map((v, i) => {
    const x = padX + i * step;
    const y = height - padY - ((v - minVal) / range) * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pts = pointList.join(' ');
  const area = `${pts} ${(padX + (values.length - 1) * step).toFixed(1)},${height} ${padX},${height}`;

  return (
    <svg viewBox="0 0 340 80" className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#spark-grad)"/>
      <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const CATEGORY_BAR_CLASSES = ['bar-tech', 'bar-education', 'bar-gaming', 'bar-lifestyle'];

const formatCompact = (value) => {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
};

const formatPct = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

// ─── Upload Zone ─────────────────────────────────────────────────────────────
function UploadZone({ onUpload, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName]     = useState(null);
  const inputRef = useRef(null);
  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.endsWith('.csv')) { onUpload(null,'Only .csv files accepted.'); return; }
    setFileName(file.name);
    const form = new FormData(); form.append('file', file);
    try { const { data } = await axios.post('/api/upload', form, { timeout: 120000 }); onUpload(data, null); }
    catch(e) { onUpload(null, e?.response?.data?.detail || e?.message || 'Upload failed'); }
  }, [onUpload]);
  const onDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  return (
    <div onClick={()=>inputRef.current?.click()}
      onDrop={onDrop} onDragOver={(e)=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)}
      className={`cursor-pointer rounded-xl border transition-all duration-200 ${isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5'} ${isUploading?'opacity-60 pointer-events-none':''}`}
      style={{ padding:'14px 16px' }}>
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e=>handleFile(e.target.files[0])}/>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
          <IconUploadCloud/>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white" style={{fontFamily:'DM Sans'}}>Upload CSV</div>
          {fileName
            ? <div className="text-xs text-emerald-400 truncate mt-0.5">{fileName}</div>
            : <div className="text-xs text-slate-400 mt-0.5">Drag & Drop or <span className="text-indigo-400 font-medium">Browse</span></div>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  /* ── STATE (UNCHANGED) ─────────────────────────────────────────────────── */
  const [messages,      setMessages]      = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [isUploading,   setIsUploading]   = useState(false);
  const [activeTable,   setActiveTable]   = useState('sales_data');
  const [previousSql,   setPreviousSql]   = useState('');
  const [input,         setInput]         = useState('');
  const [toast,         setToast]         = useState(null);
  const [activeQuery,   setActiveQuery]   = useState('');
  const [overviewData,  setOverviewData]  = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const dashboardRef = useRef(null);
  const inputRef     = useRef(null);

  const QUERY_CHIPS = [
    { label:'Monthly Views by Category',   icon:<IconBar/>   },
    { label:'Top 10 Videos by Engagement', icon:<IconFire/>  },
    { label:'Sentiment by Region',         icon:<IconGlobe/> },
    { label:'Revenue Trends',              icon:<IconTrend/> },
  ];

  const showToast = (message, type) => setToast({ message, type });

  useEffect(() => {
    let cancelled = false;

    const fetchOverview = async () => {
      setOverviewLoading(true);
      try {
        const { data } = await axios.get('/api/overview', {
          params: { table: activeTable },
        });
        if (!cancelled) setOverviewData(data);
      } catch {
        if (!cancelled) setOverviewData(null);
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    };

    fetchOverview();
    return () => {
      cancelled = true;
    };
  }, [activeTable]);

  /* ── handleSend ─────────────────────────────────────── */
  const handleSend = useCallback(async (overrideMessage) => {
    const text = (overrideMessage ?? input).trim();
    if (!text || isLoading) return;
    setInput('');
    setActiveQuery(text);

    // If answering a clarify question, prepend it for the backend but not the UI
    const isClarifying = dashboardData?.type === 'clarify';
    const apiMessageText = isClarifying ? `${dashboardData.message} — ${text}` : text;

    const userMsg = { role:'user', content:text };
    const apiMsg = { role:'user', content:apiMessageText };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    
    // For the API chat history, send what Gemini actually saw for past messages
    const chatHistory = messages.slice(-5).map(m=>({ role:m.role, content:m.content }));
    try {
      const { data } = await axios.post('/api/query', {
        user_message: apiMessageText, chat_history: chatHistory,
        previous_sql: previousSql, active_table: activeTable,
      });
      if (data.clarify) {
        setDashboardData({ type:'clarify', message:data.clarify });
        setMessages(prev => [...prev, { role:'assistant', content:`💬 ${data.clarify}` }]);
      } else if (data.error) {
        setDashboardData({ type:'error', message:data.error });
        setMessages(prev => [...prev, { role:'assistant', content:`⚠️ ${data.error}` }]);
      } else {
        const { chart_config, rows } = data;
        setDashboardData({ type:'chart', chartConfig:chart_config, rows });
        if (chart_config?.sql) setPreviousSql(chart_config.sql);
        setMessages(prev => [...prev, { role:'assistant', content:`✓ "${chart_config?.title}" — ${rows?.length??0} rows as ${chart_config?.chart_type}.` }]);
      }
    } catch(err) {
      const msg = err?.response?.data?.detail || 'Request failed. Is the backend running?';
      setDashboardData({ type:'error', message:msg });
      setMessages(prev => [...prev, { role:'assistant', content:`⚠️ ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, previousSql, activeTable, dashboardData]);

  /* ── handleUpload (UNCHANGED LOGIC) ────────────────────────────────────── */
  const handleUpload = useCallback((data, error) => {
    setIsUploading(false);
    if (error) { showToast(error, 'error'); return; }
    setActiveTable('user_data'); setMessages([]); setDashboardData(null);
    setPreviousSql(''); setActiveQuery('');
    showToast(`Loaded ${data.row_count.toLocaleString()} rows · ${data.columns.join(', ')}`, 'success');
  }, []);

  /* ── handleExport (UNCHANGED LOGIC) ────────────────────────────────────── */
  const handleExport = async () => {
    const html2canvas = (await import('html2canvas')).default;
    const el = dashboardRef.current; if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor:'#0a0d14', scale:2 });
    const link = document.createElement('a');
    link.download = `queryviz-${Date.now()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── DASHBOARD CONTENT ─────────────────────────────────────────────────── */
  const renderDashboard = () => {
    if (isLoading) return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 fade-in">
        <LoadingDots/>
        <p className="text-slate-500 text-sm">Analyzing your data…</p>
      </div>
    );

    if (dashboardData?.type === 'error') return (
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        <div className="glass rounded-2xl p-5 border border-red-700/30">
          <div className="flex items-center gap-3 mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span className="font-medium text-red-400">Query Error</span>
          </div>
          <p className="text-sm text-slate-400">{dashboardData.message}</p>
        </div>
      </div>
    );

    if (dashboardData?.type === 'clarify') return (
      <div className="flex-1 overflow-y-auto p-6 fade-in">
        <div className="glass rounded-2xl p-5 border border-yellow-700/30">
          <div className="flex items-center gap-3 mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="font-medium text-yellow-400">Need Clarification</span>
          </div>
          <p className="text-sm text-slate-300">{dashboardData.message}</p>
        </div>
      </div>
    );

    if (dashboardData?.type === 'chart') {
      const { chartConfig, rows } = dashboardData;
      const kpis = chartConfig?.kpis || [];
      return (
        <div ref={dashboardRef} id="dashboard-main" className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 fade-in">
          <div>
            <h2 className="text-xl font-semibold text-white" style={{fontFamily:'Syne'}}>{chartConfig?.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{chartConfig?.chart_type?.toUpperCase()} · {rows?.length} rows</p>
          </div>
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map((kpi,i) => (
                <div key={i} className="glass rounded-xl p-4 border">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{kpi.label}</div>
                  <div className="text-2xl font-bold text-white" style={{fontFamily:'Syne'}}>{kpi.value}</div>
                  {kpi.change && <div className="text-xs text-emerald-400 mt-1">{kpi.change}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="glass rounded-2xl p-5 border">
            <ChartRenderer chartConfig={chartConfig} rows={rows}/>
          </div>
        </div>
      );
    }

    // ── Welcome / idle state ─────────────────────────────────────────────────
    const totals = overviewData?.totals || {};
    const changes = overviewData?.changes || {};
    const monthlyViews = (overviewData?.monthly_views || []).slice(-8).map((r) => Number(r.total_views) || 0);
    const topCategories = (overviewData?.top_categories || []).slice(0, 4);
    const maxCategoryViews = Math.max(1, ...topCategories.map((c) => Number(c.total_views) || 0));

    const liveKpis = [
      {
        label: 'Views',
        value: formatCompact(totals.total_views),
        change: formatPct(changes.views_pct),
        icon: <IconEye/>,
        cls: 'kpi-blue',
      },
      {
        label: 'Watch Time',
        value: `${formatCompact(totals.total_watch_hours)} hrs`,
        change: formatPct(changes.watch_hours_pct),
        icon: <IconClock/>,
        cls: 'kpi-purple',
      },
      {
        label: 'Videos',
        value: formatCompact(totals.total_rows),
        change: formatPct(changes.videos_pct),
        icon: <IconUsers/>,
        cls: 'kpi-pink',
      },
      {
        label: 'Engagement',
        value: formatCompact(totals.total_engagement),
        change: formatPct(changes.engagement_pct),
        icon: <IconHeart/>,
        cls: 'kpi-amber',
      },
    ];

    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Welcome header */}
        <div className="text-center pt-2 pb-1">
          <h2 className="text-2xl font-bold text-white" style={{fontFamily:'Syne'}}>Welcome to Your Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1.5">Explore insights from your YouTube data</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {liveKpis.map((kpi,i) => (
            <div key={i} className={`glass rounded-xl p-4 border ${kpi.cls} flex flex-col gap-3`}>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                {kpi.icon}{kpi.label}
              </div>
              <div>
                <span className="text-2xl font-bold text-white" style={{fontFamily:'Syne'}}>{kpi.value}</span>
                {kpi.change && <span className="ml-2 text-xs text-emerald-400">{kpi.change}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Insights */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white" style={{fontFamily:'Syne'}}>Quick Insights</h3>
            <button
              onClick={() => showToast('Ask a question in the search bar to explore all charts!', 'success')}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              See All <IconArrowRight/>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Views Over Time */}
            <div className="glass rounded-2xl p-4 border col-span-1">
              <div className="text-sm font-medium text-white mb-3">Views Over Time</div>
              <div className="h-24 w-full">
                {overviewLoading ? (
                  <div className="w-full h-full rounded-md animate-pulse bg-white/5"/>
                ) : (
                  <MiniSparkline values={monthlyViews}/>
                )}
              </div>
            </div>

            {/* Top Categories */}
            <div className="glass rounded-2xl p-4 border">
              <div className="text-sm font-medium text-white mb-4">Top Categories</div>
              <div className="flex flex-col gap-3">
                {topCategories.length === 0 && (
                  <p className="text-xs text-slate-500 italic">No category data available</p>
                )}
                {topCategories.map((c, idx) => {
                  const views = Number(c.total_views) || 0;
                  const pct = Math.round((views / maxCategoryViews) * 100);
                  const cls = CATEGORY_BAR_CLASSES[idx % CATEGORY_BAR_CLASSES.length];
                  return (
                  <div key={`${c.category}-${idx}`}>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{c.category}</span><span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${cls}`} style={{width:`${pct}%`}}/>
                    </div>
                  </div>
                )})}
              </div>
            </div>

            {/* Audience Location — live choropleth map */}
            <div className="glass rounded-2xl p-4 border flex flex-col">
              <div className="text-sm font-medium text-white mb-3">Audience Location</div>
              <div className="flex-1">
                <AudienceMap table={activeTable} />
              </div>
            </div>
          </div>
        </div>

        {/* Conversation log (if any) */}
        {messages.length > 0 && (
          <div className="glass rounded-2xl p-4 border flex flex-col gap-2">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Recent Conversation</div>
            {messages.slice(-6).map((m,i) => (
              <div key={i} className={`text-xs px-3 py-2 rounded-lg ${m.role==='user' ? 'bg-indigo-500/15 text-indigo-200 self-end' : 'bg-white/5 text-slate-300 self-start'} max-w-[90%]`}>
                {m.content}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ── RENDER ────────────────────────────────────────────────────────────── */
  return (
    <>
      <Head>
        <title>QueryViz AI</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap" rel="stylesheet"/>
      </Head>

      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}

      <div className="flex flex-col h-screen overflow-hidden" style={{background:'#0a0d14'}}>

        {/* ── NAVBAR ──────────────────────────────────────────────────────── */}
        <nav className="shrink-0 h-[60px] flex items-center px-5 gap-4 border-b border-white/5 z-20"
          style={{background:'rgba(10,13,20,0.8)', backdropFilter:'blur(20px)'}}>
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0 w-[220px]">
            <div className="relative w-7 h-7">
              <div className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 blur-sm"/>
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><circle cx="11" cy="11" r="8" fill="none" stroke="white" strokeWidth="2.5"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
            </div>
            <span className="text-base font-semibold" style={{fontFamily:'Syne'}}>
              QueryViz <span style={{color:'#6366f1'}}>AI</span>
            </span>
          </div>

          {/* Search bar */}
          <div className="flex-1 flex items-center gap-2 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><IconSearch/></div>
              <input
                ref={inputRef}
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                placeholder="Ask a question about your YouTube data..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60 transition-colors"
                style={{
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.1)',
                  color:'#e2e8f0',
                  fontFamily:'DM Sans',
                }}
                onFocus={e=>{ e.target.style.borderColor='rgba(99,102,241,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.1)'; }}
                onBlur={e=>{ e.target.style.borderColor='rgba(255,255,255,0.1)'; e.target.style.boxShadow='none'; }}
              />
            </div>
            <button
              onClick={()=>handleSend()}
              disabled={isLoading || !input.trim()}
              className="ask-btn shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{background:'linear-gradient(135deg,#6366f1,#4f46e5)', fontFamily:'DM Sans'}}>
              {isLoading ? 'Asking…' : <><span>Ask</span><IconArrowRight/></>}
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExport}
              disabled={!dashboardData || dashboardData.type !== 'chart'}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white border border-white/10 hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{background:'rgba(255,255,255,0.05)'}}>
              <IconDownload/> Export
            </button>
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 cursor-pointer transition-colors"
              style={{background:'rgba(255,255,255,0.05)'}}>
              <IconUser/>
            </div>
          </div>
        </nav>

        {/* ── BODY ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* SIDEBAR */}
          <aside className="shrink-0 w-[240px] flex flex-col border-r border-white/5 overflow-y-auto"
            style={{background:'rgba(255,255,255,0.02)', backdropFilter:'blur(20px)'}}>

            {/* Upload */}
            <div className="p-3 pt-4">
              <UploadZone onUpload={handleUpload} isUploading={isUploading}/>
            </div>

            {/* Query chips */}
            <div className="px-3 pt-4 pb-2">
              <div className="flex items-center gap-2 px-1 mb-3">
                <span className="text-slate-400"><IconBulb/></span>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider" style={{fontFamily:'DM Sans'}}>Try Asking</span>
              </div>
              <div className="flex flex-col gap-1">
                {QUERY_CHIPS.map(chip => (
                  <button key={chip.label} onClick={()=>{ setInput(chip.label); handleSend(chip.label); }}
                    className="flex items-center gap-3 text-left w-full px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white border border-transparent hover:chip-active transition-all duration-150 group"
                    style={{fontFamily:'DM Sans'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='rgba(99,102,241,0.1)';e.currentTarget.style.borderColor='rgba(99,102,241,0.25)';e.currentTarget.style.color='#a5b4fc';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='';e.currentTarget.style.borderColor='transparent';e.currentTarget.style.color='';}}>
                    <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">{chip.icon}</span>
                    <span className="leading-snug">{chip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1"/>

            {/* Footer: active table */}
            <div className="p-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Sample Data</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${activeTable==='user_data' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {activeTable}
                  </span>
                  <button onClick={handleExport} className="text-slate-500 hover:text-slate-300 transition-colors" title="Export">
                    <IconDownload/>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* MAIN PANEL */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {renderDashboard()}
          </main>
        </div>
      </div>
    </>
  );
}
