import axios from "axios";
import { DashboardResponse, UploadResponse } from "../types/dashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const uploadCsvFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await axios.post(`${API_URL}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error: any) {
    console.error("Axios upload error:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up request:", error.message);
    }
    throw error;
  }
};

export const generateDashboard = async (
  dbId: string,
  prompt: string
): Promise<DashboardResponse> => {
  const res = await axios.post(`${API_URL}/dashboard`, {
    db_id: dbId,
    prompt: prompt,
  });
  return res.data;
};
