"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { ChartConfig } from "@/types/dashboard";
import KpiCard from "./KpiCard";

interface ChartRendererProps {
  config: ChartConfig;
  data: any[];
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f97316', '#3b82f6', '#10b981', '#14b8a6'];

const toNumber = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const aggregateByKey = (rows: any[], labelKey: string, valueKey: string) => {
  const grouped = new Map<string, number>();

  rows.forEach((row) => {
    const label = String(row[labelKey] ?? "Unknown");
    grouped.set(label, (grouped.get(label) ?? 0) + toNumber(row[valueKey]));
  });

  return Array.from(grouped.entries())
    .map(([label, value]) => ({ [labelKey]: label, [valueKey]: value }))
    .sort((a, b) => toNumber(b[valueKey]) - toNumber(a[valueKey]));
};

const buildMultiSeriesData = (rows: any[], xKey: string, yKey: string, colorKey: string) => {
  const seriesTotals = new Map<string, number>();

  rows.forEach((row) => {
    const seriesName = String(row[colorKey] ?? "Unknown");
    seriesTotals.set(seriesName, (seriesTotals.get(seriesName) ?? 0) + toNumber(row[yKey]));
  });

  const topSeries = Array.from(seriesTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([seriesName]) => seriesName);

  const pivoted = new Map<string, Record<string, string | number>>();
  rows.forEach((row) => {
    const xValue = String(row[xKey] ?? "Unknown");
    const seriesName = String(row[colorKey] ?? "Unknown");
    if (!topSeries.includes(seriesName)) {
      return;
    }

    const existing = pivoted.get(xValue) ?? { [xKey]: xValue };
    existing[seriesName] = toNumber(existing[seriesName]) + toNumber(row[yKey]);
    pivoted.set(xValue, existing);
  });

  return {
    chartData: Array.from(pivoted.values()),
    seriesKeys: topSeries,
  };
};

export default function ChartRenderer({ config, data }: ChartRendererProps) {
  if (!data || data.length === 0) return null;

  if (config.chart_type === "kpi") {
    // For KPI, we just take the first row's metric
    const val = data[0][config.y_key];
    // Format if it's a number
    const displayVal = typeof val === 'number' ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val) : val;
    return <KpiCard title={config.title} value={displayVal} />;
  }

  const aggregatedData = aggregateByKey(data, config.x_key, config.y_key);
  const pieData = aggregatedData.slice(0, 8);
  const hasColorSeries = Boolean(config.color_key);
  const multiSeries = config.color_key
    ? buildMultiSeriesData(data, config.x_key, config.y_key, config.color_key)
    : { chartData: [], seriesKeys: [] as string[] };
  const cartesianData = hasColorSeries ? multiSeries.chartData : aggregatedData;
  const showLegend = config.chart_type === "pie"
    ? pieData.length <= 8
    : hasColorSeries && multiSeries.seriesKeys.length > 1;

  const renderChartBody = () => {
    switch (config.chart_type) {
      case "bar":
        return (
          <BarChart data={cartesianData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
            <XAxis dataKey={config.x_key} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#2a2a35', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
            {hasColorSeries ? (
              multiSeries.seriesKeys.map((seriesKey, index) => (
                <Bar key={seriesKey} dataKey={seriesKey} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
              ))
            ) : (
              <Bar dataKey={config.y_key} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={cartesianData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
            <XAxis dataKey={config.x_key} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#2a2a35', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
            {hasColorSeries ? (
              multiSeries.seriesKeys.map((seriesKey, index) => (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))
            ) : (
              <Line type="monotone" dataKey={config.y_key} stroke={COLORS[1]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            )}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={cartesianData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" vertical={false} />
            <XAxis dataKey={config.x_key} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#2a2a35', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
            {hasColorSeries ? (
              multiSeries.seriesKeys.map((seriesKey, index) => (
                <Area
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              ))
            ) : (
              <Area type="monotone" dataKey={config.y_key} stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorY)" />
            )}
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <Tooltip
              contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#2a2a35', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            {showLegend && <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="square" />}
            <Pie
              data={pieData}
              dataKey={config.y_key}
              nameKey={config.x_key}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={65}
              paddingAngle={2}
              stroke="none"
              label={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
        
      case "scatter":
        return (
          <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
            <XAxis dataKey={config.x_key} type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis dataKey={config.y_key} type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#0d0d12', borderColor: '#2a2a35', borderRadius: '8px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Scatter name={config.title} data={data} fill={COLORS[2]} />
          </ScatterChart>
        );

      default:
        return <div className="text-slate-400">Unsupported chart type: {config.chart_type}</div>;
    }
  };

  return (
    <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-[1.5rem] p-6 shadow-lg hover:border-[#3f3f5a] transition-shadow h-full min-h-[350px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[15px] font-bold text-white tracking-wide">{config.title}</h3>
        <button className="text-slate-500 hover:text-slate-300 px-1">
          <span className="sr-only">Menu</span>
          <svg width="18" height="4" viewBox="0 0 18 4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4C3.88071 4 5 2.88071 5 1.5C5 0.119288 3.88071 -1 2.5 -1C1.11929 -1 0 0.119288 0 1.5C0 2.88071 1.11929 4 2.5 4Z" fill="currentColor"/>
            <path d="M9 4C10.3807 4 11.5 2.88071 11.5 1.5C11.5 0.119288 10.3807 -1 9 -1C7.61929 -1 6.5 0.119288 6.5 1.5C6.5 2.88071 7.61929 4 9 4Z" fill="currentColor"/>
            <path d="M15.5 4C16.8807 4 18 2.88071 18 1.5C18 0.119288 16.8807 -1 15.5 -1C14.1193 -1 13 0.119288 13 1.5C13 2.88071 14.1193 4 15.5 4Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div className="flex-grow w-full h-full relative min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChartBody() as any}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
