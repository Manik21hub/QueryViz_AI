"use client";

import { Eye, Clock, Users, Heart } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
}

export default function KpiCard({ title, value }: KpiCardProps) {
  // Mock logic to show a percentage badge mimicking the reference UI
  const isPositive = Math.random() > 0.5;
  const mockPercentage = (Math.random() * 5).toFixed(1) + "%";
  
  // Choose an icon and color based on title hash for variety, matching the reference screenshot colors
  const titleLower = title.toLowerCase();
  
  let Icon = Eye;
  let colorTheme = "text-blue-500";
  
  if (titleLower.includes("watch") || titleLower.includes("time")) {
    Icon = Clock;
    colorTheme = "text-purple-500";
  } else if (titleLower.includes("video") || titleLower.includes("user")) {
    Icon = Users;
    colorTheme = "text-pink-500";
  } else if (titleLower.includes("engage") || titleLower.includes("like")) {
    Icon = Heart;
    colorTheme = "text-orange-500";
  }

  return (
    <div className="bg-[#1a1a24] border border-[#2a2a35] rounded-2xl p-6 flex flex-col justify-center shadow-lg hover:border-[#3f3f5a] transition-colors h-full min-h-[140px]">
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${colorTheme}`} />
        <h3 className="text-[13px] font-medium text-slate-400">
          {title}
        </h3>
      </div>
      
      <div className="flex items-baseline gap-3">
        <div className="text-[2rem] leading-none font-bold text-white tracking-tight">
          {value}
        </div>
        <div className={`text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-emerald-400'}`}>
          {/* Note: Reference image shows both + and - in green/similar colors depending on context, keeping simple green/red here for realism but leaning green */}
          {isPositive ? '+' : '-'}{mockPercentage}
        </div>
      </div>
    </div>
  );
}
