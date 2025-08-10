import { ApiClient, RequestConfig, ApiResponse } from '@/shared/types/services';

class HttpClient implements ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseURL}${url}`;
    const headers = {
      ...this.defaultHeaders,
      ...config?.headers,
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const requestConfig: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    let attempt = 0;
    const maxRetries = config?.retries || 3;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config?.timeout || 10000);

        const response = await fetch(fullUrl, {
          ...requestConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            // Handle unauthorized - redirect to login
            localStorage.removeItem('auth_token');
            window.location.href = '/auth/login';
            throw new Error('Unauthorized');
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        return {
          data: result.data || result,
          success: true,
          message: result.message,
          pagination: result.pagination,
        };
      } catch (error) {
        attempt++;
        if (attempt > maxRetries) {
          return {
            data: null as T,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      data: null as T,
      success: false,
      error: 'Max retries exceeded',
    };
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  setBaseURL(baseURL: string) {
    this.baseURL = baseURL;
  }

  setDefaultHeader(key: string, value: string) {
    this.defaultHeaders[key] = value;
  }
}

// Create singleton instance
export const apiClient = new HttpClient(
  process.env.NODE_ENV === 'production' 
    ? 'https://api.brandos.app' 
    : 'http://localhost:3001'
);

export default HttpClient;