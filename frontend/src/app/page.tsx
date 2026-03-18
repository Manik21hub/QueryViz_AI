"use client";

import { useEffect, useState } from "react";
import FileUploader from "@/components/FileUploader";
import PromptBar from "@/components/PromptBar";
import DashboardCanvas from "@/components/DashboardCanvas";
import { generateDashboard } from "@/lib/api";
import { DashboardResponse } from "@/types/dashboard";
import { 
  BarChart2, Flame, Globe2, TrendingUp, Home as HomeIcon, Download, User as UserIcon, Database
} from "lucide-react";

export default function Home() {
  const [dbId, setDbId] = useState<string | null>(null);
  const [schemaPreview, setSchemaPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  const runDashboardQuery = async (nextDbId: string, prompt: string) => {
    setIsLoading(true);
    try {
      const result = await generateDashboard(nextDbId, prompt);
      setDashboardData(result);
    } catch (error: any) {
      console.error(error);
      setDashboardData({
        sql: "",
        data: [],
        charts: [],
        message: error.response?.data?.detail || "Failed to generate dashboard. Please try a different prompt.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (id: string, schema: string) => {
    setDbId(id);
    setSchemaPreview(schema);
    setDashboardData(null); // Clear previous dashboard when new dataset uploaded
    void runDashboardQuery(id, "Show key insights and trends from this dataset");
  };

  const handlePromptSubmit = async (prompt: string) => {
    if (!dbId) {
      alert("Please upload a dataset first.");
      return;
    }

    await runDashboardQuery(dbId, prompt);
  };

  const handleHome = () => {
    setDbId(null);
    setSchemaPreview(null);
    setDashboardData(null);
  };

  const handleExport = () => {
    if (!dashboardData) {
      alert("No dashboard to export yet! Please ask a question first.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dashboardData, null, 2));
    const link = document.createElement("a");
    link.href = dataStr;
    link.download = "queryviz_dashboard_export.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSample = () => {
    // Generate a quick dummy CSV on the fly for demonstration
    const csvContent = "data:text/csv;charset=utf-8,date,category,views,revenue,region\n2023-01-01,Tech,1500,300,North\n2023-01-02,Gaming,2500,450,South\n2023-01-03,Vlogs,800,100,East";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "sample_youtube_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (dbId && !dashboardData && !isLoading) {
      void runDashboardQuery(dbId, "Show key insights and trends from this dataset");
    }
  }, [dbId, dashboardData, isLoading]);

  return (
    <div className="min-h-screen bg-[#0d0d12] text-slate-200 flex font-sans">
      
      {/* Left Sidebar */}
      <aside className="w-[280px] bg-[#14141a] border-r border-[#1f1f2e] flex flex-col shrink-0 h-screen sticky top-0">
        
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <span className="font-bold text-white text-lg">Q</span>
          </div>
          <span className="font-bold text-lg tracking-wide text-white">QueryViz <span className="text-indigo-500">AI</span></span>
        </div>

        {/* Upload Action */}
        <div className="px-5 mb-8">
          <FileUploader onUploadSuccess={handleUploadSuccess} />
        </div>

        {/* Try Asking Section */}
        <div className="px-6 mb-2">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-4 flex items-center gap-2">
            <Flame className="w-3 h-3" /> TRY ASKING
          </h3>
          <nav className="space-y-1">
            <button onClick={() => handlePromptSubmit("Monthly Views by Category")} className="w-full flex flex-col text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-[#1f1f2e] rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
                <span className="font-medium group-hover:text-white">Monthly Views by Category</span>
              </div>
            </button>
            <button onClick={() => handlePromptSubmit("Top 10 Videos by Engagement")} className="w-full flex flex-col text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-[#1f1f2e] rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-slate-500 group-hover:text-rose-400" />
                <span className="font-medium group-hover:text-white">Top 10 Videos by Engagement</span>
              </div>
            </button>
            <button onClick={() => handlePromptSubmit("Sentiment by Region")} className="w-full flex flex-col text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-[#1f1f2e] rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <Globe2 className="w-4 h-4 text-slate-500 group-hover:text-sky-400" />
                <span className="font-medium group-hover:text-white">Sentiment by Region</span>
              </div>
            </button>
            <button onClick={() => handlePromptSubmit("Revenue Trends")} className="w-full flex flex-col text-left px-3 py-2.5 text-sm text-slate-300 hover:bg-[#1f1f2e] rounded-lg transition-colors group">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                <span className="font-medium group-hover:text-white">Revenue Trends</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Bottom Sample Data Link */}
        <div className="mt-auto px-6 py-6 border-t border-[#1f1f2e] flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Sample Data</span>
          <button onClick={handleDownloadSample} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a24] hover:bg-[#252533] border border-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg transition-colors">
            sales_data <Download className="w-3 h-3" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
        
        {/* Top Navigation Bar */}
        <header className="h-[88px] border-b border-[#1f1f2e] flex items-center justify-between px-8 bg-[#0d0d12]/80 backdrop-blur-md sticky top-0 z-50">
          
          {/* Central Search / Prompt Bar */}
          <div className="flex-1 max-w-2xl mx-auto">
            <PromptBar onSubmit={handlePromptSubmit} isLoading={isLoading} disabled={!dbId} />
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-4 ml-8">
            <button onClick={handleHome} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
              <HomeIcon className="w-4 h-4" /> Home
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
            <div onClick={() => alert("User profile feature coming soon!")} className="w-9 h-9 ml-2 rounded-full border border-slate-700 bg-[#1a1a24] flex items-center justify-center cursor-pointer hover:border-slate-500 transition-colors">
              <UserIcon className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Area */}
        <div className="flex-1 overflow-y-auto w-full p-8 md:p-12 scroll-smooth">
          
          {/* Context Header */}
          <div className="flex flex-col items-center justify-center text-center mb-12 space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              Welcome to Your Dashboard
            </h1>
            <p className="text-slate-400 font-medium tracking-wide">
              {dbId ? "Explore insights from your YouTube data" : "Please upload a dataset from the sidebar to begin"}
            </p>
          </div>
          
          {dbId && (
            <div className="w-full max-w-[1400px] mx-auto animate-in fade-in duration-700">
              <DashboardCanvas dashboardData={dashboardData} isLoading={isLoading} />
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}
