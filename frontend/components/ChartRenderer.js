import { useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart,  Bar,
  PieChart,  Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Brush,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = ['#7F77DD', '#1D9E75', '#BA7517', '#D85A30', '#378ADD'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtVal = (v) => {
  const n = Number(v);
  if (isNaN(n)) return String(v ?? '—');
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
};

// ─── Shared tooltip style ────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 12,
    color: '#0f172a',
    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
    padding: '8px 12px',
  },
  labelStyle: { color: '#374151', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#374151' },
};

const AXIS_TICK = { fill: '#64748b', fontSize: 11 };
const GRID     = <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />;

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KpiCards({ kpis }) {
  if (!kpis || kpis.length === 0) return null;

  const cols = kpis.length <= 2 ? 2 : kpis.length === 3 ? 3 : 4;
  const gridStyle = { display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 };

  return (
    <div style={gridStyle} className="mb-5">
      {kpis.map((kpi, i) => {
        const change   = String(kpi.change || '');
        const positive = change.startsWith('+');
        const negative = change.startsWith('-');
        const changeColor = positive ? '#10b981' : negative ? '#ef4444' : '#94a3b8';

        return (
          <div
            key={i}
            className="rounded-xl px-4 py-3 flex flex-col gap-1.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: '#64748b' }}>
              {kpi.label}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif', lineHeight: 1.1 }}>
                {kpi.value ?? '—'}
              </span>
              {change && (
                <span className="text-xs font-medium pb-0.5" style={{ color: changeColor }}>
                  {change}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...TOOLTIP_STYLE.contentStyle }}>
      {label !== undefined && (
        <div style={{ ...TOOLTIP_STYLE.labelStyle, marginBottom: 6 }}>{label}</div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
          <span style={{ color: '#374151' }}>{p.name}: <strong>{fmtVal(p.value)}</strong></span>
        </div>
      ))}
    </div>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
function LineChartView({ rows, x_axis, y_axis }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={rows} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
        {GRID}
        <XAxis dataKey={x_axis} tick={AXIS_TICK} tickLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmtVal} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
        <Brush dataKey={x_axis} height={20} travellerWidth={6}
          fill="rgba(127,119,221,0.08)" stroke="rgba(127,119,221,0.4)"
          traveller={<rect width={6} height={14} fill="#7F77DD" rx={3} />}
        />
        <Line
          type="monotone"
          dataKey={y_axis}
          stroke={PALETTE[0]}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: PALETTE[0], strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChartView({ rows, x_axis, y_axis }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
        {GRID}
        <XAxis dataKey={x_axis} tick={AXIS_TICK} tickLine={false} />
        <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmtVal} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
        <Brush dataKey={x_axis} height={20} travellerWidth={6}
          fill="rgba(127,119,221,0.08)" stroke="rgba(127,119,221,0.4)"
        />
        <Bar dataKey={y_axis} fill={PALETTE[0]} radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────
function PieChartView({ rows, x_axis, y_axis }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const pieData = rows.map(r => ({
    name:  String(r[x_axis] ?? ''),
    value: Number(r[y_axis]) || 0,
  }));

  const total = pieData.reduce((s, d) => s + d.value, 0);

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const pct = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : '0';
    return (
      <div style={{ ...TOOLTIP_STYLE.contentStyle }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#374151' }}>{payload[0].name}</div>
        <div className="text-xs" style={{ color: '#374151' }}>
          Views: <strong>{fmtVal(payload[0].value)}</strong>
        </div>
        <div className="text-xs" style={{ color: '#374151' }}>
          Share: <strong>{pct}%</strong>
        </div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={activeIndex !== null ? 0 : 100}   // base — overridden per cell
          dataKey="value"
          onClick={(_, idx) => setActiveIndex(idx === activeIndex ? null : idx)}
          label={({ name, percent }) =>
            percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
          }
          labelLine={false}
        >
          {pieData.map((_, i) => (
            <Cell
              key={i}
              fill={PALETTE[i % PALETTE.length]}
              outerRadius={i === activeIndex ? 115 : 100}
              stroke="none"
              style={{ cursor: 'pointer', transition: 'all .2s' }}
            />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Scatter Chart ────────────────────────────────────────────────────────────
function ScatterChartView({ rows, x_axis, y_axis }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
        {GRID}
        <XAxis
          dataKey={x_axis}
          name={x_axis}
          tick={AXIS_TICK}
          tickLine={false}
          tickFormatter={fmtVal}
          label={{ value: x_axis.replace(/_/g, ' '), position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 11 }}
        />
        <YAxis
          dataKey={y_axis}
          name={y_axis}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmtVal}
          label={{ value: y_axis.replace(/_/g, ' '), angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }}
        />
        <ZAxis range={[30, 30]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: 'rgba(127,119,221,0.4)' }}
          content={<CustomTooltip />}
        />
        <Scatter data={rows} fill={PALETTE[0]} fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
function TableView({ rows }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const cols = Object.keys(rows[0] || {});

  const handleSort = useCallback((col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }, [sortCol]);

  const sorted = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const av = a[sortCol], bv = b[sortCol];
    const an = Number(av), bn = Number(bv);
    const cmp = !isNaN(an) && !isNaN(bn)
      ? an - bn
      : String(av ?? '').localeCompare(String(bv ?? ''));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="overflow-auto max-h-[320px] rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
          <tr style={{ background: 'rgba(10,13,20,0.95)', backdropFilter: 'blur(12px)' }}>
            {cols.map(col => {
              const active = sortCol === col;
              return (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="text-left px-4 py-3 cursor-pointer select-none whitespace-nowrap"
                  style={{
                    color: active ? '#7F77DD' : '#64748b',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    userSelect: 'none',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    {col.replace(/_/g, ' ')}
                    <span style={{ opacity: active ? 1 : 0.3, fontSize: 10 }}>
                      {active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(127,119,221,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'}
            >
              {cols.map(col => (
                <td key={col} className="px-4 py-2.5 whitespace-nowrap" style={{ color: '#cbd5e1' }}>
                  {String(row[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ChartRenderer ───────────────────────────────────────────────────────
export default function ChartRenderer({ chart_config, rows }) {
  if (!chart_config) return null;
  if (!rows || rows.length === 0) {
    return (
      <p className="text-slate-500 text-sm italic text-center py-10">
        No data returned for this query.
      </p>
    );
  }

  const { chart_type, x_axis, y_axis, title, kpis = [] } = chart_config;

  const renderChart = () => {
    switch (chart_type) {
      case 'line':    return <LineChartView    rows={rows} x_axis={x_axis} y_axis={y_axis} />;
      case 'bar':     return <BarChartView     rows={rows} x_axis={x_axis} y_axis={y_axis} />;
      case 'pie':     return <PieChartView     rows={rows} x_axis={x_axis} y_axis={y_axis} />;
      case 'scatter': return <ScatterChartView rows={rows} x_axis={x_axis} y_axis={y_axis} />;
      case 'table':   return <TableView        rows={rows} />;
      default:        return <BarChartView     rows={rows} x_axis={x_axis} y_axis={y_axis} />;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      {title && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            {title}
          </h2>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(127,119,221,0.15)', color: '#7F77DD', border: '1px solid rgba(127,119,221,0.25)' }}
          >
            {chart_type}
          </span>
        </div>
      )}

      {/* KPI cards */}
      <KpiCards kpis={kpis} />

      {/* Chart */}
      {renderChart()}
    </div>
  );
}
