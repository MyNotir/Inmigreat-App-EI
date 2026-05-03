import { GRAPHQL_HTTP_URL, GRAPHQL_WS_URL } from '../config/env';
import { createClient, type Client, type Sink } from 'graphql-ws';
import { getResolvedAuthToken } from './api';

export interface GraphQLClientConfig {
  endpoint: string;
  subscriptionEndpoint: string;
  timeout: number;
  headers: Record<string, string>;
}

export interface GraphQLRequestOptions<TVariables extends Record<string, unknown> = Record<string, unknown>> {
  variables?: TVariables;
  operationName?: string;
  headers?: Record<string, string>;
  timeout?: number;
  authenticated?: boolean;
  shouldLogError?: (error: GraphQLExceptionPayload) => boolean;
}

export interface GraphQLSubscriptionObserver<TData> {
  next: (data: TData) => void;
  error?: (error: GraphQLException) => void;
  complete?: () => void;
}

export interface GraphQLErrorLocation {
  line: number;
  column: number;
}

export interface GraphQLFormattedError {
  message: string;
  path?: Array<string | number>;
  locations?: GraphQLErrorLocation[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<TData> {
  data: TData;
  status: number;
  headers: Record<string, string>;
  requestId: string;
  extensions?: Record<string, unknown>;
}

export type GraphQLExceptionType =
  | 'network_error'
  | 'auth_error'
  | 'server_error'
  | 'timeout_error'
  | 'graphql_error';

export interface GraphQLExceptionPayload {
  type: GraphQLExceptionType;
  code: number;
  message: string;
  requestId: string;
  errors?: GraphQLFormattedError[];
  extensions?: Record<string, unknown>;
  originalError?: Error;
}

export class GraphQLException extends Error {
  public readonly type: GraphQLExceptionType;
  public readonly code: number;
  public readonly requestId: string;
  public readonly errors?: GraphQLFormattedError[];
  public readonly extensions?: Record<string, unknown>;

  constructor(payload: GraphQLExceptionPayload) {
    super(payload.message);
    this.name = 'GraphQLException';
    this.type = payload.type;
    this.code = payload.code;
    this.requestId = payload.requestId;
    this.errors = payload.errors;
    this.extensions = payload.extensions;
  }
}

const DEFAULT_CONFIG: GraphQLClientConfig = {
  endpoint: GRAPHQL_HTTP_URL,
  subscriptionEndpoint: GRAPHQL_WS_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

let subscriptionClient: Client | null = null;

function generateRequestId(): string {
  return `gql_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function parseHeaders(headers: Headers): Record<string, string> {
  const values: Record<string, string> = {};

  headers.forEach((value, key) => {
    values[key] = value;
  });

  return values;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getGraphQLErrorMessage(errors: GraphQLFormattedError[] | undefined): string | undefined {
  return errors?.[0]?.message;
}

function getExtensions(body: Record<string, unknown>): Record<string, unknown> | undefined {
  return isRecord(body.extensions) ? body.extensions : undefined;
}

function getGraphQLErrors(body: Record<string, unknown>): GraphQLFormattedError[] | undefined {
  return Array.isArray(body.errors) ? (body.errors as GraphQLFormattedError[]) : undefined;
}

function categorizeHttpError(status: number): GraphQLExceptionType {
  if (status === 401 || status === 403) {
    return 'auth_error';
  }

  if (status >= 500) {
    return 'server_error';
  }

  return 'graphql_error';
}

function getErrorMessage(type: GraphQLExceptionType, fallback?: string): string {
  if (fallback) {
    return fallback;
  }

  switch (type) {
    case 'network_error':
      return 'Sin conexión a internet. Por favor verifica tu conexión.';
    case 'timeout_error':
      return 'La conexión está lenta. Por favor intenta de nuevo.';
    case 'auth_error':
      return 'Sesión expirada. Por favor inicia sesión nuevamente.';
    case 'server_error':
      return 'El servidor no pudo procesar la consulta.';
    case 'graphql_error':
    default:
      return 'La consulta GraphQL devolvió un error.';
  }
}

function logGraphQLError(
  operationName: string | undefined,
  requestId: string,
  error: GraphQLExceptionPayload,
  shouldLogError?: (error: GraphQLExceptionPayload) => boolean,
): void {
  if (__DEV__ && shouldLogError?.(error) !== false) {
    console.error(`[GraphQL] ${requestId} ${operationName || 'anonymous'}`, {
      type: error.type,
      code: error.code,
      message: error.message,
      errors: error.errors,
      extensions: error.extensions,
      originalError: error.originalError,
    });
  }
}

function getSubscriptionClient(): Client {
  if (subscriptionClient) {
    return subscriptionClient;
  }

  subscriptionClient = createClient({
    url: DEFAULT_CONFIG.subscriptionEndpoint,
    webSocketImpl: WebSocket,
    lazy: true,
    keepAlive: 30000,
    retryAttempts: 1000,
    shouldRetry: () => true,
    connectionParams: async () => {
      const token = await getResolvedAuthToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  });

  return subscriptionClient;
}

export function resetGraphQLClient(): void {
  if (subscriptionClient) {
    subscriptionClient.dispose();
    subscriptionClient = null;
  }
}

function toSubscriptionError(
  requestId: string,
  error: unknown,
  operationName?: string,
): GraphQLException {
  if (Array.isArray(error)) {
    const payload: GraphQLExceptionPayload = {
      type: 'graphql_error',
      code: 0,
      message: getErrorMessage('graphql_error', error[0]?.message),
      requestId,
      errors: error as GraphQLFormattedError[],
    };
    logGraphQLError(operationName, requestId, payload);
    return new GraphQLException(payload);
  }

  const payload: GraphQLExceptionPayload = {
    type: 'network_error',
    code: 0,
    message:
      error instanceof Error && error.message.trim()
        ? error.message
        : getErrorMessage('network_error'),
    requestId,
    originalError: error instanceof Error ? error : undefined,
  };
  logGraphQLError(operationName, requestId, payload);
  return new GraphQLException(payload);
}

async function request<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  document: string,
  options: GraphQLRequestOptions<TVariables> = {},
): Promise<GraphQLResponse<TData>> {
  const requestId = generateRequestId();
  const {
    variables,
    operationName,
    headers = {},
    timeout = DEFAULT_CONFIG.timeout,
    authenticated = true,
    shouldLogError,
  } = options;

  const requestHeaders: Record<string, string> = {
    ...DEFAULT_CONFIG.headers,
    ...headers,
  };

  if (authenticated) {
    const token = await getResolvedAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    } else if (__DEV__) {
      console.warn(`[GraphQL] ${requestId} ${operationName || 'anonymous'} missing auth token before request`);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(DEFAULT_CONFIG.endpoint, {
      method: 'POST',
      headers: requestHeaders,
      signal: controller.signal,
      body: JSON.stringify({
        query: document,
        variables,
        operationName,
      }),
    });

    clearTimeout(timeoutId);

    const responseHeaders = parseHeaders(response.headers);
    const body = await response.json().catch(() => null);

    if (!isRecord(body)) {
      const errorPayload: GraphQLExceptionPayload = {
        type: response.ok ? 'server_error' : categorizeHttpError(response.status),
        code: response.status,
        message: 'La respuesta GraphQL no es válida.',
        requestId,
      };
      logGraphQLError(operationName, requestId, errorPayload, shouldLogError);
      throw new GraphQLException(errorPayload);
    }

    const errors = getGraphQLErrors(body);
    const extensions = getExtensions(body);

    if (!response.ok) {
      const errorType = categorizeHttpError(response.status);
      const errorPayload: GraphQLExceptionPayload = {
        type: errorType,
        code: response.status,
        message: getErrorMessage(errorType, getGraphQLErrorMessage(errors)),
        requestId,
        errors,
        extensions,
      };
      logGraphQLError(operationName, requestId, errorPayload, shouldLogError);
      throw new GraphQLException(errorPayload);
    }

    if (errors?.length) {
      const errorPayload: GraphQLExceptionPayload = {
        type: 'graphql_error',
        code: response.status,
        message: getErrorMessage('graphql_error', getGraphQLErrorMessage(errors)),
        requestId,
        errors,
        extensions,
      };
      logGraphQLError(operationName, requestId, errorPayload, shouldLogError);
      throw new GraphQLException(errorPayload);
    }

    return {
      data: body.data as TData,
      status: response.status,
      headers: responseHeaders,
      requestId,
      extensions,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof GraphQLException) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      const errorPayload: GraphQLExceptionPayload = {
        type: 'timeout_error',
        code: 0,
        message: getErrorMessage('timeout_error'),
        requestId,
        originalError: error,
      };
      logGraphQLError(operationName, requestId, errorPayload, shouldLogError);
      throw new GraphQLException(errorPayload);
    }

    const errorPayload: GraphQLExceptionPayload = {
      type: 'network_error',
      code: 0,
      message: getErrorMessage('network_error'),
      requestId,
      originalError: error instanceof Error ? error : undefined,
    };
    logGraphQLError(operationName, requestId, errorPayload, shouldLogError);
    throw new GraphQLException(errorPayload);
  }
}

export async function query<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  document: string,
  options?: GraphQLRequestOptions<TVariables>,
): Promise<GraphQLResponse<TData>> {
  return request<TData, TVariables>(document, options);
}

export async function mutation<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  document: string,
  options?: GraphQLRequestOptions<TVariables>,
): Promise<GraphQLResponse<TData>> {
  return request<TData, TVariables>(document, options);
}

export function subscribe<TData, TVariables extends Record<string, unknown> = Record<string, unknown>>(
  document: string,
  options: GraphQLRequestOptions<TVariables>,
  observer: GraphQLSubscriptionObserver<TData>,
): () => void {
  const requestId = generateRequestId();
  const client = getSubscriptionClient();

  const sink: Sink<unknown> = {
    next: (result) => {
      const payload = result as {
        data?: TData;
        errors?: GraphQLFormattedError[];
      };

      if (payload.errors?.length) {
        observer.error?.(
          new GraphQLException({
            type: 'graphql_error',
            code: 0,
            message: getErrorMessage('graphql_error', getGraphQLErrorMessage(payload.errors)),
            requestId,
            errors: payload.errors,
          }),
        );
        return;
      }

      if (payload.data) {
        observer.next(payload.data);
      }
    },
    error: (error) => {
      observer.error?.(toSubscriptionError(requestId, error, options.operationName));
    },
    complete: () => {
      observer.complete?.();
    },
  };

  const dispose = client.subscribe(
    {
      operationName: options.operationName,
      query: document,
      variables: options.variables,
    },
    sink,
  );

  return () => {
    dispose();
  };
}

export function getGraphQLEndpoint(): string {
  return DEFAULT_CONFIG.endpoint;
}

export function getGraphQLSubscriptionEndpoint(): string {
  return DEFAULT_CONFIG.subscriptionEndpoint;
}

export const graphqlClient = {
  request,
  query,
  mutation,
  subscribe,
  getEndpoint: getGraphQLEndpoint,
  getSubscriptionEndpoint: getGraphQLSubscriptionEndpoint,
  reset: resetGraphQLClient,
};

export default graphqlClient;