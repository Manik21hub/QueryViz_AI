export type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "kpi";

export interface ChartConfig {
  chart_type: ChartType;
  title: string;
  x_key: string;
  y_key: string;
  color_key?: string;
  highlight?: string;
}

export interface DashboardResponse {
  sql: string;
  data: any[];
  charts: ChartConfig[];
  message?: string;
}

export interface UploadResponse {
  message: string;
  db_id: str;
  schema_preview: string;
}
