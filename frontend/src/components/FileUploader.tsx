"use client";

import { useState } from "react";
import { UploadCloud, File, CheckCircle } from "lucide-react";

interface FileUploaderProps {
  onUploadSuccess: (dbId: string, schemaPreview: string) => void;
}

export default function FileUploader({ onUploadSuccess }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      alert("Please upload a CSV file.");
      return;
    }
    setFile(selectedFile);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    
    // Dynamic import to avoid client-side error on initial render
    const { uploadCsvFile } = await import("@/lib/api");

    try {
      const result = await uploadCsvFile(selectedFile);
      onUploadSuccess(result.db_id, result.schema_preview);
    } catch (error) {
      console.error(error);
      alert("Upload failed. Please try again.");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={`border rounded-xl p-3 flex items-center gap-4 cursor-pointer transition-colors duration-200 ${
        isDragging
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-white/10 bg-[#1a1a24] hover:bg-[#23232f]"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".csv"
        onChange={handleChange}
      />
      
      {!file ? (
        <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-3 w-full">
          <div className="w-10 h-10 rounded-lg bg-[#252533] border border-white/5 flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-200">Upload CSV</span>
            <span className="text-xs text-slate-500">Drag & Drop or <span className="text-indigo-400">Browse</span></span>
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-3 w-full">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isUploading ? 'bg-indigo-500/20' : 'bg-emerald-500/20'}`}>
            {isUploading ? (
              <div className="w-5 h-5 rounded-full border-2 border-t-indigo-400 border-indigo-500/30 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-semibold text-slate-200 truncate">{file.name}</span>
            <span className="text-xs text-slate-500 truncate">
              {isUploading ? "Processing..." : "Dataset ready"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
