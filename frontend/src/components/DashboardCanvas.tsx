"use client";

import { motion } from "framer-motion";
import ChartRenderer from "./ChartRenderer";
import { DashboardResponse } from "@/types/dashboard";

interface DashboardCanvasProps {
  dashboardData: DashboardResponse | null;
  isLoading: boolean;
}

export default function DashboardCanvas({ dashboardData, isLoading }: DashboardCanvasProps) {
  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium animate-pulse">Analyzing data and generating charts...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="w-full h-[40vh] flex items-center justify-center border-2 border-dashed border-[#2a2a35] rounded-3xl bg-[#14141a]">
        <p className="text-slate-500 text-lg">Your dashboard will appear here</p>
      </div>
    );
  }

  if (!dashboardData.charts || dashboardData.charts.length === 0) {
    return (
      <div className="w-full h-[40vh] flex flex-col items-center justify-center bg-[#1a1a24] rounded-3xl border border-[#2a2a35] p-8 text-center shadow-lg">
        <h3 className="text-xl font-semibold text-white mb-2">No charts generated</h3>
        <p className="text-slate-400 mb-6">{dashboardData.message || "The AI couldn't generate a visualization for this query."}</p>
        <div className="w-full max-w-2xl bg-[#0d0d12] rounded-xl p-4 overflow-x-auto border border-white/5">
          <p className="text-sm font-mono text-slate-500 text-left">Generated SQL:</p>
          <code className="text-rose-400 text-sm text-left block mt-2 whitespace-pre-wrap">
            {dashboardData.sql}
          </code>
        </div>
      </div>
    );
  }

  // Count kinds of charts to determine layout
  const kpis = dashboardData.charts.filter(c => c.chart_type === 'kpi');
  const mainCharts = dashboardData.charts.filter(c => c.chart_type !== 'kpi');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* KPI Row */}
      {kpis.length > 0 && (
        <div className={`grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`}>
          {kpis.slice(0, 4).map((chartConfig, i) => (
            <motion.div
              key={`kpi-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <ChartRenderer config={chartConfig} data={dashboardData.data} />
            </motion.div>
          ))}
        </div>
      )}

      {/* Main Charts Grid - 3 Column Layout taking inspiration from the reference */}
      {mainCharts.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-4 pb-2 border-b border-white/5">
            <h2 className="text-lg font-bold text-white tracking-wide">Quick Insights</h2>
            <button onClick={() => alert("Expanded chart view coming soon!")} className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              See All <span>→</span>
            </button>
          </div>
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {mainCharts.map((chartConfig, i) => {
              // Logic to span columns based on chart type: Area and Line charts need more width
              const isWide = chartConfig.chart_type === 'area' || chartConfig.chart_type === 'line';
              const spanClass = isWide ? "lg:col-span-2" : "lg:col-span-1";
              
              return (
                <motion.div
                  key={`chart-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (kpis.length * 0.1) + (i * 0.15), type: "spring", stiffness: 100 }}
                  className={`${spanClass} flex`}
                >
                  <div className="w-full flex-grow">
                    <ChartRenderer config={chartConfig} data={dashboardData.data} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* SQL context toggle (optional helper for users) */}
      <details className="mt-8 group bg-[#1a1a24] border border-[#2a2a35] rounded-xl overflow-hidden shadow-lg">
        <summary className="cursor-pointer text-xs font-medium text-slate-400 uppercase tracking-wider p-4 hover:bg-[#23232f] transition-colors">
          View Generated SQL Context
        </summary>
        <div className="p-4 border-t border-[#2a2a35] bg-[#0d0d12]">
          <pre className="text-emerald-400 font-mono text-sm overflow-x-auto">
            {dashboardData.sql}
          </pre>
        </div>
      </details>
    </div>
  );
}
