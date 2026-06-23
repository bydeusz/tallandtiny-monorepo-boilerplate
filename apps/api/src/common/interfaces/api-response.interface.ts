export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  meta: Record<string, unknown> | null;
  requestId: string;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  requestId: string;
  timestamp: string;
  path: string;
}
