/**
 * API Client Service - Centralized HTTP client for backend communication
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 12.1-12.6
 */

import { API_BASE_URL } from '../config/env';
import { getAccessToken as getSessionAccessToken } from './session';

// ============================================================================
// Configuration
// ============================================================================

/**
 * API configuration
 */
export interface ApiConfig {
  /** Base URL for the API */
  baseURL: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Default headers for all requests */
  headers: Record<string, string>;
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * API error types for categorization
 */
export type ApiErrorType =
  | 'network_error'
  | 'validation_error'
  | 'auth_error'
  | 'server_error'
  | 'timeout_error';

/**
 * Structured API error
 */
export interface ApiError {
  /** Error type category */
  type: ApiErrorType;
  /** HTTP status code (0 for network errors) */
  code: number;
  /** Human-readable error message */
  message: string;
  /** Field-specific validation errors */
  details?: Record<string, string[]>;
  /** Unique request identifier for debugging */
  requestId: string;
  /** Original error (only in development) */
  originalError?: Error;
}

/**
 * API error class for throwing structured errors
 */
export class ApiException extends Error {
  public readonly type: ApiErrorType;
  public readonly code: number;
  public readonly details?: Record<string, string[]>;
  public readonly requestId: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiException';
    this.type = error.type;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
  }

  toApiError(): ApiError {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      details: this.details,
      requestId: this.requestId,
    };
  }
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Request configuration options
 */
export interface RequestConfig {
  /** Custom headers for this request */
  headers?: Record<string, string>;
  /** Request timeout override */
  timeout?: number;
  /** Whether this request requires authentication */
  authenticated?: boolean;
  /** Query parameters */
  params?: Record<string, string | number | boolean>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Build URL with query parameters
 */
function buildUrl(baseURL: string, endpoint: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(endpoint, baseURL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  return url.toString();
}

/**
 * Categorize error based on status code or error type
 */
function categorizeError(status: number, error?: Error): ApiErrorType {
  if (!status || status === 0) {
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
      return 'timeout_error';
    }
    return 'network_error';
  }
  if (status === 401 || status === 403) {
    return 'auth_error';
  }
  if (status === 400 || status === 422) {
    return 'validation_error';
  }
  if (status >= 500) {
    return 'server_error';
  }
  return 'server_error';
}

/**
 * Get user-friendly error message based on error type
 */
function getErrorMessage(type: ApiErrorType, serverMessage?: string): string {
  switch (type) {
    case 'network_error':
      return 'Sin conexión a internet. Por favor verifica tu conexión.';
    case 'timeout_error':
      return 'La conexión está lenta. Por favor intenta de nuevo.';
    case 'auth_error':
      return serverMessage || 'Sesión expirada. Por favor inicia sesión nuevamente.';
    case 'validation_error':
      return serverMessage || 'Los datos proporcionados no son válidos.';
    case 'server_error':
      return 'Algo salió mal. Por favor intenta de nuevo.';
    default:
      return serverMessage || 'Ocurrió un error inesperado.';
  }
}

/**
 * Extract validation errors from response body
 */
function extractValidationErrors(body: unknown): Record<string, string[]> | undefined {
  if (typeof body === 'object' && body !== null) {
    const errorBody = body as Record<string, unknown>;
    if (errorBody.errors && typeof errorBody.errors === 'object') {
      return errorBody.errors as Record<string, string[]>;
    }
    if (errorBody.details && typeof errorBody.details === 'object') {
      return errorBody.details as Record<string, string[]>;
    }
  }
  return undefined;
}

/**
 * Log error in development mode
 */
function logError(requestId: string, method: string, url: string, error: ApiError, originalError?: Error): void {
  if (__DEV__) {
    console.error(`[API] ${requestId} ${method} ${url}`, {
      type: error.type,
      code: error.code,
      message: error.message,
      details: error.details,
      originalError,
    });
  }
}

// ============================================================================
// API Client State
// ============================================================================

/** Current authentication token */
let authToken: string | null = null;

/** Callback for handling auth failures (logout) */
let onAuthFailure: (() => void) | null = null;

/** Callback for refreshing an expired access token */
let onTokenRefresh: (() => Promise<string>) | null = null;

/** Flag to prevent multiple simultaneous refresh attempts */
let isRefreshing = false;

/** Queue of requests waiting for token refresh */
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: ApiError) => void;
}> = [];

// ============================================================================
// Token Management
// ============================================================================

/**
 * Set the authentication token for subsequent requests
 * @param token - JWT access token
 */
export function setAuthToken(token: string): void {
  authToken = token;
}

/**
 * Clear the authentication token
 */
export function clearAuthToken(): void {
  authToken = null;
}

/**
 * Get the current authentication token
 */
export function getAuthToken(): string | null {
  return authToken;
}

/**
 * Resolve the authentication token from memory first and SecureStore as fallback.
 */
export async function getResolvedAuthToken(): Promise<string | null> {
  if (authToken) {
    return authToken;
  }

  const storedToken = await getSessionAccessToken();

  if (storedToken) {
    authToken = storedToken;
  }

  return storedToken;
}

/**
 * Set callback for authentication failures
 * @param callback - Function to call when auth fails (typically logout)
 */
export function setOnAuthFailure(callback: () => void): void {
  onAuthFailure = callback;
}

/**
 * Set callback used to refresh the access token when a request gets a 401.
 */
export function setOnTokenRefresh(callback: (() => Promise<string>) | null): void {
  onTokenRefresh = callback;
}


// ============================================================================
// Token Refresh Logic
// ============================================================================

/**
 * Attempt to refresh the access token
 * @returns New access token or throws error
 */
async function refreshAccessToken(): Promise<string> {
  if (!onTokenRefresh) {
    throw new ApiException({
      type: 'auth_error',
      code: 401,
      message: 'No token refresh handler configured',
      requestId: generateRequestId(),
    });
  }

  return onTokenRefresh();
}

/**
 * Handle token refresh with queue to prevent multiple simultaneous refreshes
 */
async function handleTokenRefresh(): Promise<string> {
  if (isRefreshing) {
    // Wait for the ongoing refresh to complete
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    
    // Resolve all queued requests with the new token
    refreshQueue.forEach(({ resolve }) => resolve(newToken));
    refreshQueue = [];
    
    return newToken;
  } catch (error) {
    // Reject all queued requests
    const apiError = error instanceof ApiException 
      ? error.toApiError() 
      : {
          type: 'auth_error' as ApiErrorType,
          code: 401,
          message: 'Token refresh failed',
          requestId: generateRequestId(),
        };
    
    refreshQueue.forEach(({ reject }) => reject(apiError));
    refreshQueue = [];
    
    // Trigger auth failure callback (logout)
    if (onAuthFailure) {
      onAuthFailure();
    }
    
    throw error;
  } finally {
    isRefreshing = false;
  }
}

// ============================================================================
// Core Request Function
// ============================================================================

/**
 * Make an HTTP request to the API
 */
async function request<T>(
  method: string,
  endpoint: string,
  data?: unknown,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const requestId = generateRequestId();
  const { headers = {}, timeout = DEFAULT_CONFIG.timeout, authenticated = true, params } = config;
  
  const url = buildUrl(DEFAULT_CONFIG.baseURL, endpoint, params);
  
  // Build headers
  const requestHeaders: Record<string, string> = {
    ...DEFAULT_CONFIG.headers,
    ...headers,
  };

  const resolvedToken = authenticated ? await getResolvedAuthToken() : null;
  
  // Add auth token if authenticated request and token exists
  if (resolvedToken) {
    requestHeaders['Authorization'] = `Bearer ${resolvedToken}`;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    };

    if (data && method !== 'GET') {
      fetchOptions.body = JSON.stringify(data);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    // Parse response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Handle 401 - attempt token refresh
    if (response.status === 401 && authenticated) {
      try {
        const newToken = await handleTokenRefresh();
        
        // Retry the original request with new token
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
        
        const retryResponse = await fetch(url, {
          ...fetchOptions,
          headers: requestHeaders,
        });

        if (!retryResponse.ok) {
          const errorBody = await retryResponse.json().catch(() => ({}));
          const errorType = categorizeError(retryResponse.status);
          const apiError: ApiError = {
            type: errorType,
            code: retryResponse.status,
            message: getErrorMessage(errorType, errorBody.message),
            details: extractValidationErrors(errorBody),
            requestId,
          };
          logError(requestId, method, url, apiError);
          throw new ApiException(apiError);
        }

        if (retryResponse.status === 204) {
          return {
            data: undefined as T,
            status: retryResponse.status,
            headers: responseHeaders,
          };
        }

        const retryText = await retryResponse.text();
        const retryData = retryText ? (JSON.parse(retryText) as T) : (undefined as T);
        return {
          data: retryData,
          status: retryResponse.status,
          headers: responseHeaders,
        };
      } catch (refreshError) {
        // Token refresh failed, throw auth error
        const apiError: ApiError = {
          type: 'auth_error',
          code: 401,
          message: 'Sesión expirada. Por favor inicia sesión nuevamente.',
          requestId,
        };
        logError(requestId, method, url, apiError);
        throw new ApiException(apiError);
      }
    }

    // Handle other error responses
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorType = categorizeError(response.status);
      const apiError: ApiError = {
        type: errorType,
        code: response.status,
        message: getErrorMessage(errorType, errorBody.message || errorBody.error),
        details: extractValidationErrors(errorBody),
        requestId,
      };
      logError(requestId, method, url, apiError);
      throw new ApiException(apiError);
    }

    // Parse successful response
    if (response.status === 204) {
      return {
        data: undefined as T,
        status: response.status,
        headers: responseHeaders,
      };
    }

    const responseText = await response.text();
    const responseData = responseText ? (JSON.parse(responseText) as T) : (undefined as T);
    
    return {
      data: responseData,
      status: response.status,
      headers: responseHeaders,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Already an ApiException, rethrow
    if (error instanceof ApiException) {
      throw error;
    }

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      const apiError: ApiError = {
        type: 'timeout_error',
        code: 0,
        message: getErrorMessage('timeout_error'),
        requestId,
      };
      logError(requestId, method, url, apiError, error);
      throw new ApiException(apiError);
    }

    // Handle network errors
    const apiError: ApiError = {
      type: 'network_error',
      code: 0,
      message: getErrorMessage('network_error'),
      requestId,
      originalError: __DEV__ ? (error as Error) : undefined,
    };
    logError(requestId, method, url, apiError, error as Error);
    throw new ApiException(apiError);
  }
}

// ============================================================================
// HTTP Methods
// ============================================================================

/**
 * Make a GET request
 */
export async function get<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>('GET', endpoint, undefined, config);
}

/**
 * Make a POST request
 */
export async function post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>('POST', endpoint, data, config);
}

/**
 * Make a PUT request
 */
export async function put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>('PUT', endpoint, data, config);
}

/**
 * Make a PATCH request
 */
export async function patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>('PATCH', endpoint, data, config);
}

/**
 * Make a DELETE request
 */
export async function del<T>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
  return request<T>('DELETE', endpoint, undefined, config);
}

// ============================================================================
// API Client Object
// ============================================================================

/**
 * API client instance with all methods
 */
export const apiClient = {
  get,
  post,
  put,
  patch,
  delete: del,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  setOnAuthFailure,
  setOnTokenRefresh,
};

export default apiClient;
