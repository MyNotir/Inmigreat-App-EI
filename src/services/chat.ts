/**
 * Chat Service - AI assistant communication with SSE streaming
 * Validates: Requirements 9.1-9.6
 */

import { API_BASE_URL } from '../config/env';
import { fetch as expoFetch } from 'expo/fetch';
import { apiClient, getResolvedAuthToken } from './api';
import type { ChatMessage, ChatSuggestedAction } from '../types/user';

// ============================================================================
// Types
// ============================================================================

/**
 * Chat message request payload
 * Note: only one of userUscisCaseId / userEoirCaseId can be set.
 */
export interface ChatAppContext {
  activeTab?: string;
  currentScreen?: string;
  sourceScreen?: string;
  sourceAction?: string;
  caseId?: string;
  caseSource?: 'uscis' | 'eoir';
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  userUscisCaseId?: string;
  userEoirCaseId?: string;
  appContext?: ChatAppContext;
}

export interface StartConversationRequest {
  userUscisCaseId?: string;
  userEoirCaseId?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  userUscisCaseId?: string | null;
  userEoirCaseId?: string | null;
  conversationSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

/**
 * Streaming chunk callback
 * @param chunk - Text chunk received
 * @param done - Whether streaming is complete
 */
export type StreamCallback = (chunk: string, done: boolean) => void;

interface BackendSuggestedAction {
  kind: ChatSuggestedAction['kind'];
  label: string;
  targetTab: ChatSuggestedAction['targetTab'];
  targetCaseId?: string;
  targetCaseSource?: ChatSuggestedAction['targetCaseSource'];
}

interface BackendChatResponse {
  id: string;
  conversationId: string;
  content: string;
  suggestedAction?: BackendSuggestedAction;
}

interface BackendConversationMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
  timestamp?: string;
  conversationId?: string;
  suggestedAction?: BackendSuggestedAction | null;
}

/**
 * Re-export ChatMessage from types for consumers of this service
 */
export type { ChatMessage };

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// State
// ============================================================================

/** Local conversation history cache */
const conversationHistory: Map<string, ChatMessage[]> = new Map();

function normalizeChatRole(role: string): ChatMessage['role'] {
  return role.toUpperCase() === 'USER' ? 'user' : 'assistant';
}

function toChatMessage(
  message: BackendConversationMessage,
  fallbackConversationId?: string,
): ChatMessage {
  return {
    id: message.id,
    role: normalizeChatRole(message.role),
    content: message.content,
    timestamp: message.timestamp ?? message.createdAt ?? new Date().toISOString(),
    conversationId: message.conversationId ?? fallbackConversationId,
    suggestedAction: toSuggestedAction(message.suggestedAction),
  };
}

function toSuggestedAction(action?: BackendSuggestedAction | null): ChatSuggestedAction | undefined {
  if (!action) {
    return undefined;
  }

  return {
    kind: action.kind,
    label: action.label,
    targetTab: action.targetTab,
    targetCaseId: action.targetCaseId,
    targetCaseSource: action.targetCaseSource,
  };
}

interface ChatSseEvent {
  event: string;
  data: Record<string, unknown> | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChatSseEvent(rawEvent: string): ChatSseEvent | null {
  const lines = rawEvent
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0 && !line.startsWith(':'));

  if (lines.length === 0) {
    return null;
  }

  let event = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return { event, data: null };
  }

  try {
    const parsed = JSON.parse(dataLines.join('\n'));
    return {
      event,
      data: isRecord(parsed) ? parsed : null,
    };
  } catch {
    return null;
  }
}

function readSseString(data: Record<string, unknown> | null, key: string): string | undefined {
  const value = data?.[key];
  return typeof value === 'string' ? value : undefined;
}

function readSseSuggestedAction(
  data: Record<string, unknown> | null,
): ChatSuggestedAction | undefined {
  const action = data?.suggestedAction;
  return isRecord(action) ? toSuggestedAction(action as unknown as BackendSuggestedAction) : undefined;
}

// ============================================================================
// Non-Streaming API
// ============================================================================

/**
 * Send a message and get a complete response (non-streaming)
 * @param request - Chat request
 * @returns Complete chat message response
 */
/**
 * Start a new conversation, optionally linked to a case.
 */
export async function startConversation(
  input: StartConversationRequest = {},
): Promise<Conversation> {
  const response = await apiClient.post<Conversation>('/chat/conversations', input);
  return response.data;
}

/**
 * List all conversations for the authenticated user.
 */
export async function listConversations(): Promise<Conversation[]> {
  const response = await apiClient.get<Conversation[]>('/chat/conversations');
  return response.data;
}

/**
 * Delete a conversation by ID.
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  await apiClient.delete(`/chat/conversations/${conversationId}`);
  conversationHistory.delete(conversationId);
}

export async function sendMessage(request: ChatRequest): Promise<ChatMessage> {
  const response = await apiClient.post<BackendChatResponse>(
    '/chat',
    request,
  );

  const msg: ChatMessage = {
    id: response.data.id,
    role: 'assistant',
    content: response.data.content,
    timestamp: new Date().toISOString(),
    conversationId: response.data.conversationId,
    suggestedAction: toSuggestedAction(response.data.suggestedAction),
  };

  addToHistory(response.data.conversationId, msg);
  return msg;
}

// ============================================================================
// Streaming API (SSE)
// ============================================================================

/**
 * Send a message and receive streaming response via SSE
 * @param request - Chat request
 * @param onChunk - Callback for each chunk received
 * @returns Final complete message
 */
export async function sendMessageStreaming(
  request: ChatRequest,
  onChunk: StreamCallback
): Promise<ChatMessage> {
  const token = await getResolvedAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  // Add user message to history immediately
  const tempConversationId = request.conversationId || `temp_${Date.now()}`;
  const userMessage: ChatMessage = {
    id: `user_${Date.now()}`,
    role: 'user',
    content: request.message,
    timestamp: new Date().toISOString(),
    conversationId: tempConversationId,
  };
  addToHistory(tempConversationId, userMessage);
  
  try {
    const response = await expoFetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    const contentType = response.headers.get('content-type') ?? '';
    
    if (!response.ok || !contentType.includes('text/event-stream')) {
      console.log('[Chat] Streaming failed, falling back to non-streaming');
      return sendMessage(request);
    }
    
    const reader = response.body?.getReader();
    
    if (!reader) {
      return sendMessage(request);
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finalMessageId = '';
    let finalConversationId = tempConversationId;
    let finalSuggestedAction: ChatSuggestedAction | undefined;

    const handleEvent = (event: ChatSseEvent) => {
      if (event.event === 'error') {
        throw new Error(`Chat error: ${readSseString(event.data, 'message') ?? readSseString(event.data, 'error') ?? 'Unknown chat stream error'}`);
      }

      if (event.event === 'done') {
        finalMessageId = readSseString(event.data, 'id') ?? finalMessageId;
        finalConversationId = readSseString(event.data, 'conversationId') ?? finalConversationId;
        fullContent = readSseString(event.data, 'content') ?? fullContent;
        finalSuggestedAction = readSseSuggestedAction(event.data) ?? finalSuggestedAction;
        onChunk('', true);
        return;
      }

      if (event.event === 'chunk' || event.event === 'message') {
        const chunk = readSseString(event.data, 'content') ?? readSseString(event.data, 'text');
        if (!chunk) {
          return;
        }

        fullContent += chunk;
        onChunk(chunk, false);
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          buffer += decoder.decode().replace(/\r\n/g, '\n');
          break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

        while (true) {
          const separatorIndex = buffer.indexOf('\n\n');
          if (separatorIndex === -1) {
            break;
          }

          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);

          const parsedEvent = parseChatSseEvent(rawEvent);
          if (!parsedEvent) {
            continue;
          }

          handleEvent(parsedEvent);
        }
      }

      if (buffer.trim()) {
        const trailingEvent = parseChatSseEvent(buffer.trim());
        if (trailingEvent) {
          handleEvent(trailingEvent);
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Create final message
    const assistantMessage: ChatMessage = {
      id: finalMessageId || `assistant_${Date.now()}`,
      role: 'assistant',
      content: fullContent,
      timestamp: new Date().toISOString(),
      conversationId: finalConversationId,
      suggestedAction: finalSuggestedAction,
    };
    
    // Update history with correct conversation ID
    if (finalConversationId !== tempConversationId) {
      // Move messages to correct conversation
      const tempHistory = conversationHistory.get(tempConversationId) || [];
      conversationHistory.delete(tempConversationId);
      
      tempHistory.forEach(msg => {
        msg.conversationId = finalConversationId;
        addToHistory(finalConversationId, msg);
      });
    }
    
    addToHistory(finalConversationId, assistantMessage);
    
    return assistantMessage;
  } catch (error) {
    console.error('[Chat] Streaming error:', error);
    
    // Fallback to non-streaming
    console.log('[Chat] Falling back to non-streaming');
    return sendMessage(request);
  }
}

// ============================================================================
// Conversation History
// ============================================================================

/**
 * Add a message to local conversation history
 */
function addToHistory(conversationId: string, message: ChatMessage): void {
  const history = conversationHistory.get(conversationId) || [];
  
  // Avoid duplicates
  if (!history.find(m => m.id === message.id)) {
    history.push(message);
    conversationHistory.set(conversationId, history);
  }
}

/**
 * Get conversation history from API
 * @param conversationId - Conversation ID
 * @returns Array of messages in the conversation
 */
export async function getConversationHistory(conversationId: string): Promise<ChatMessage[]> {
  // Check local cache first
  const cached = conversationHistory.get(conversationId);
  if (cached && cached.length > 0) {
    return cached;
  }
  
  // Fetch from API
  const response = await apiClient.get<{ messages: BackendConversationMessage[] }>(`/chat/conversations/${conversationId}`);

  // Cache the history
  const msgs = (response.data.messages ?? []).map((message) =>
    toChatMessage(message, conversationId),
  );
  conversationHistory.set(conversationId, msgs);

  return msgs;
}

/**
 * Get local conversation history (without API call)
 * @param conversationId - Conversation ID
 * @returns Cached messages or empty array
 */
export function getLocalHistory(conversationId: string): ChatMessage[] {
  return conversationHistory.get(conversationId) || [];
}

/**
 * Clear local conversation history
 * @param conversationId - Optional conversation ID to clear (clears all if not provided)
 */
export function clearHistory(conversationId?: string): void {
  if (conversationId) {
    conversationHistory.delete(conversationId);
  } else {
    conversationHistory.clear();
  }
}

/**
 * Get all conversation IDs with local history
 * @returns Array of conversation IDs
 */
export function getConversationIds(): string[] {
  return Array.from(conversationHistory.keys());
}

// ============================================================================
// Default Export
// ============================================================================

export const chatService = {
  // Conversations
  startConversation,
  listConversations,
  deleteConversation,

  // Messaging
  sendMessage,
  sendMessageStreaming,

  // History
  getConversationHistory,
  getLocalHistory,
  clearHistory,
  getConversationIds,
};

export default chatService;
