import { useState, useEffect, useRef } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import axios from 'axios';

// ─── ISO numeric (world-atlas) → alpha-2 code lookup ──────────────────────
// world-atlas/countries-110m.json uses ISO 3166-1 numeric country IDs.
// The DB uses alpha-2 codes (PK, US, UK/GB, etc.).
const NUM_TO_A2 = {
  4:'AF', 8:'AL', 12:'DZ', 24:'AO', 32:'AR', 36:'AU', 40:'AT', 50:'BD',
  56:'BE', 68:'BO', 76:'BR', 100:'BG', 116:'KH', 120:'CM', 124:'CA',
  152:'CL', 156:'CN', 170:'CO', 180:'CD', 192:'CU', 203:'CZ', 208:'DK',
  214:'DO', 218:'EC', 818:'EG', 231:'ET', 246:'FI', 250:'FR', 276:'DE',
  288:'GH', 300:'GR', 320:'GT', 324:'GN', 340:'HN', 348:'HU', 356:'IN',
  360:'ID', 364:'IR', 368:'IQ', 372:'IE', 376:'IL', 380:'IT', 388:'JM',
  392:'JP', 400:'JO', 404:'KE', 408:'KP', 410:'KR', 414:'KW', 422:'LB',
  434:'LY', 484:'MX', 504:'MA', 508:'MZ', 524:'NP', 528:'NL', 554:'NZ',
  558:'NI', 566:'NG', 578:'NO', 586:'PK', 591:'PA', 604:'PE', 608:'PH',
  616:'PL', 620:'PT', 630:'PR', 634:'QA', 642:'RO', 643:'RU', 682:'SA',
  686:'SN', 694:'SL', 706:'SO', 710:'ZA', 724:'ES', 144:'LK', 736:'SD',
  752:'SE', 756:'CH', 760:'SY', 764:'TH', 788:'TN', 792:'TR', 800:'UG',
  804:'UA', 784:'AE', 826:'GB', 840:'US', 858:'UY', 862:'VE', 704:'VN',
  887:'YE', 894:'ZM', 716:'ZW', 44:'BS', 64:'BT', 204:'BJ', 60:'BM',
};

// The DB stores 'UK' but correct ISO is GB; handle both.
const normaliseCode = (code) => (code === 'UK' ? 'GB' : code);

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmtNum = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const viewsToFill = (views) => {
  if (!views || views === 0) return 'rgba(255,255,255,0.05)';
  if (views > 100_000) return 'rgba(99,102,241,0.9)';
  if (views > 50_000)  return 'rgba(99,102,241,0.5)';
  return 'rgba(99,102,241,0.2)';
};

const viewsToDot = (views) => {
  if (!views || views === 0) return '#1e2030';
  if (views > 100_000) return '#6366f1';
  if (views > 50_000)  return 'rgba(99,102,241,0.6)';
  return 'rgba(99,102,241,0.35)';
};

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ─── AudienceMap ──────────────────────────────────────────────────────────
export default function AudienceMap({ table = 'sales_data' }) {
  const [viewsByCode, setViewsByCode] = useState({});  // { 'US': 120000 }
  const [regionNames, setRegionNames] = useState({});  // { 'US': 'United States' }
  const [topRegions,  setTopRegions]  = useState([]);  // sorted top 5
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [tooltip,     setTooltip]     = useState(null); // { x, y, name, views }
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        // Use the direct SQL endpoint — no Gemini quota consumed
        const { data } = await axios.get('/api/regions', {
          params: { table },
        });

        if (cancelled) return;

        const rows = data?.rows || [];
        if (!rows.length) { setLoading(false); return; }

        const byCode = {};
        const names  = {};

        rows.forEach(r => {
          const raw  = String(r.region || '').trim();
          const code = normaliseCode(raw.toUpperCase());
          const v    = Number(r.total_views) || 0;
          if (code) {
            byCode[code] = (byCode[code] || 0) + v;
            if (r.region_name) names[code] = r.region_name;
          }
        });

        const sorted = Object.entries(byCode)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([code, views]) => ({ code, views, name: names[code] || code }));

        setViewsByCode(byCode);
        setRegionNames(names);
        setTopRegions(sorted);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || 'Failed to load map data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [table]);

  // ── Tooltip helpers ───────────────────────────────────────────────────
  const handleMouseEnter = (geo, evt) => {
    const numId   = Number(geo.id);
    const a2      = NUM_TO_A2[numId];
    const views   = a2 ? (viewsByCode[a2] || 0) : 0;
    const name    = (a2 && regionNames[a2]) || geo.properties?.name || 'Unknown';
    const rect    = containerRef.current?.getBoundingClientRect() || {};
    setTooltip({
      x: evt.clientX - (rect.left || 0) + 12,
      y: evt.clientY - (rect.top  || 0) - 10,
      name,
      views,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col gap-3 h-full">
        <div className="flex-1 rounded-xl animate-pulse" style={{ background:'rgba(255,255,255,0.05)', minHeight:'120px' }}/>
        <div className="flex flex-col gap-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background:'rgba(99,102,241,0.3)' }}/>
              <div className="h-2.5 rounded animate-pulse flex-1" style={{ background:'rgba(255,255,255,0.05)' }}/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-slate-500 italic">{error}</div>
    );
  }

  // ── Map + list ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 h-full relative" ref={containerRef}>
      {/* World map */}
      <div className="w-full" style={{ height:'280px', overflow:'hidden' }}>
        <ComposableMap
          projectionConfig={{ scale: 175 }}
          style={{ width:'100%', height:'100%', background:'transparent' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => {
                const numId = Number(geo.id);
                const a2    = NUM_TO_A2[numId];
                const views = a2 ? (viewsByCode[a2] || 0) : 0;
                const fill  = viewsToFill(views);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={0.5}
                    style={{
                      default:  { outline: 'none' },
                      hover:    { outline: 'none', fill: a2 && views > 0 ? 'rgba(99,102,241,1)' : 'rgba(255,255,255,0.12)', cursor: 'pointer' },
                      pressed:  { outline: 'none' },
                    }}
                    onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                    onMouseLeave={handleMouseLeave}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-30 text-xs"
          style={{
            left:         tooltip.x,
            top:          tooltip.y,
            background:   'rgba(10,13,20,0.95)',
            border:       '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding:      '8px 12px',
            fontFamily:   'DM Sans',
            color:        '#fff',
            whiteSpace:   'nowrap',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div className="font-medium">{tooltip.name}</div>
          {tooltip.views > 0 && (
            <div style={{ color:'rgba(165,180,252,0.9)', marginTop:'2px' }}>
              {fmtNum(tooltip.views)} views
            </div>
          )}
        </div>
      )}

      {/* Top 5 regions list */}
      {topRegions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {topRegions.map(r => (
            <div key={r.code} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: viewsToDot(r.views) }}
              />
              <span className="text-slate-300 flex-1 truncate">{r.name}</span>
              <span className="text-slate-500 font-medium tabular-nums shrink-0">{fmtNum(r.views)}</span>
            </div>
          ))}
        </div>
      )}

      {topRegions.length === 0 && !loading && (
        <p className="text-xs text-slate-600 italic text-center">No regional data available</p>
      )}
    </div>
  );
}
