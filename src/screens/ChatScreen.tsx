/**
 * ChatScreen
 * 
 * Main chat interface for AI-powered immigration questions.
 * Displays welcome state with suggested questions for empty chat,
 * message list with auto-scroll, and text input with send button.
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 13.1, 13.6, 13.7, 13.9
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useViewTranslation } from '../i18n';
import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { ChatInput } from '../components/chat/ChatInput';
import { GlassCard } from '../components/common/GlassCard';
import { MessageBubble } from '../components/chat/MessageBubble';
import { TypingIndicator } from '../components/chat/TypingIndicator';
import { SuggestedQuestions, type SuggestedQuestion } from '../components/chat/SuggestedQuestions';
import { InmigreatLogo } from '../icons';
import { casesService } from '../services/cases';
import { chatService, type Conversation } from '../services/chat';
import { getActiveNotificationContext } from '../services/notifications';
import { colors, spacing, typography, borderRadius } from '../styles/theme';
import type { Case } from '../types/case';
import type { ChatMessage, ChatSuggestedAction } from '../types/user';
import type { MainTabParamList } from '../types/navigation';

type DraftCaseContext = {
  caseId?: string;
  caseSource?: 'uscis' | 'eoir';
  userUscisCaseId?: string;
  userEoirCaseId?: string;
  label?: string;
};

type ChatEntrySourceContext = {
  sourceScreen?: string;
  sourceAction?: string;
};

type ChatSendContextOverride = {
  sourceScreen?: string;
  sourceAction?: string;
};

type ChatTranslate = (key: string, fallback: string, options?: Record<string, unknown>) => string;

function getChatLocale(language?: string): string {
  switch (language) {
    case 'en':
      return 'en-US';
    case 'pt':
      return 'pt-BR';
    default:
      return 'es-ES';
  }
}

function buildSuggestedQuestions(tx: ChatTranslate): SuggestedQuestion[] {
  return [
    {
      id: 'processing-time',
      text: tx('welcome.questions.processingTime', 'Cuanto tiempo tarda el proceso de mi caso?'),
      icon: '⏱️',
    },
    {
      id: 'documents',
      text: tx('welcome.questions.documents', 'Que documentos necesito preparar?'),
      icon: '📄',
    },
    {
      id: 'status',
      text: tx('welcome.questions.status', 'Como puedo verificar el estado de mi caso?'),
      icon: '🔍',
    },
    {
      id: 'accelerate',
      text: tx('welcome.questions.accelerate', 'Hay formas de acelerar mi proceso?'),
      icon: '🚀',
    },
    {
      id: 'interview',
      text: tx('welcome.questions.interview', 'Como me preparo para la entrevista?'),
      icon: '💬',
    },
    {
      id: 'rfe',
      text: tx('welcome.questions.rfe', 'Que hago si recibo un RFE?'),
      icon: '📬',
    },
  ];
}

function buildDraftCaseContextFromCase(caseItem: Case): DraftCaseContext {
  return {
    caseId: caseItem.id,
    caseSource: caseItem.source,
    userUscisCaseId: caseItem.source === 'uscis' ? caseItem.id : undefined,
    userEoirCaseId: caseItem.source === 'eoir' ? caseItem.id : undefined,
    label: caseItem.source === 'eoir'
      ? `EOIR · ${caseItem.receiptNumber}`
      : `USCIS · ${caseItem.receiptNumber}`,
  };
}

function buildDraftCaseContextFromRoute(params?: MainTabParamList['Chat']): DraftCaseContext | null {
  if (!params?.userUscisCaseId && !params?.userEoirCaseId) {
    return null;
  }

  return {
    caseId: params.caseId ?? params.userUscisCaseId ?? params.userEoirCaseId,
    caseSource: params.caseSource ?? (params.userEoirCaseId ? 'eoir' : 'uscis'),
    userUscisCaseId: params.userUscisCaseId,
    userEoirCaseId: params.userEoirCaseId,
  };
}

function buildConversationCaseContext(conversation?: Conversation): DraftCaseContext | null {
  if (!conversation?.userUscisCaseId && !conversation?.userEoirCaseId) {
    return null;
  }

  return {
    caseId: conversation.userUscisCaseId ?? conversation.userEoirCaseId ?? undefined,
    caseSource: conversation.userEoirCaseId ? 'eoir' : 'uscis',
    userUscisCaseId: conversation.userUscisCaseId ?? undefined,
    userEoirCaseId: conversation.userEoirCaseId ?? undefined,
  };
}

function getDraftCaseLabel(caseContext: DraftCaseContext, tx: ChatTranslate): string {
  if (caseContext.label) {
    return caseContext.label;
  }

  if (caseContext.caseSource === 'eoir') {
    return tx('context.linkedEoir', 'EOIR vinculado');
  }

  if (caseContext.caseSource === 'uscis') {
    return tx('context.linkedUscis', 'USCIS vinculado');
  }

  return tx('context.generalOption', 'General');
}

function formatConversationTitle(conversation: Conversation, tx: ChatTranslate): string {
  const summary = conversation.conversationSummary?.trim();
  if (summary) {
    return summary.length > 88 ? `${summary.slice(0, 85)}...` : summary;
  }

  if (conversation.userEoirCaseId) {
    return tx('context.conversationLinkedEoir', 'Conversacion vinculada a caso EOIR');
  }

  if (conversation.userUscisCaseId) {
    return tx('context.conversationLinkedUscis', 'Conversacion vinculada a caso USCIS');
  }

  return tx('context.conversationGeneral', 'Conversacion general');
}

function formatConversationMeta(conversation: Conversation, locale: string): string {
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(new Date(conversation.updatedAt));

  if (conversation.userEoirCaseId) {
    return `EOIR · ${formattedDate}`;
  }

  if (conversation.userUscisCaseId) {
    return `USCIS · ${formattedDate}`;
  }

  return formattedDate;
}

function formatChatTimestamp(timestamp: string, locale: string, tx: ChatTranslate): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return tx('message.timestamp.now', 'Ahora');
  }

  if (diffMins < 60) {
    return tx('message.timestamp.minutesAgo', 'hace {{value}}m', { value: diffMins });
  }

  if (diffHours < 24) {
    return tx('message.timestamp.hoursAgo', 'hace {{value}}h', { value: diffHours });
  }

  if (diffDays < 7) {
    return tx('message.timestamp.daysAgo', 'hace {{value}}d', { value: diffDays });
  }

  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Welcome state component - Requirement 13.1
 * Displays when chat has no messages
 */
interface WelcomeStateProps {
  onQuestionPress: (question: SuggestedQuestion) => void;
  title: string;
  subtitle: string;
  suggestedQuestionsTitle: string;
  questions: SuggestedQuestion[];
}

const WelcomeState: React.FC<WelcomeStateProps> = ({
  onQuestionPress,
  title,
  subtitle,
  suggestedQuestionsTitle,
  questions,
}) => (
  <View style={styles.welcomeContainer}>
    <View style={styles.welcomeLogoContainer}>
      <InmigreatLogo size={48} strokeWidth={1.5} />
    </View>
    <Text style={styles.welcomeTitle}>{title}</Text>
    <Text style={styles.welcomeSubtitle}>{subtitle}</Text>
    <SuggestedQuestions
      questions={questions}
      onQuestionPress={onQuestionPress}
      title={suggestedQuestionsTitle}
      style={styles.suggestedQuestions}
    />
  </View>
);

/**
 * ChatScreen Component
 * 
 * Main chat interface with:
 * - Welcome state with suggested questions for empty chat (Req 13.1)
 * - Text input with send button at the bottom (Req 13.6)
 * - Auto-scroll to latest message (Req 13.7)
 * - Case context card navigation (Req 13.9)
 */
export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Chat'>>();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const routeSeedRef = useRef<string | null>(null);
  const { t, i18n } = useViewTranslation('chat');
  const tx = useCallback<ChatTranslate>(
    (key, fallback, options) => t(key, { defaultValue: fallback, ...(options ?? {}) }),
    [t],
  );
  const locale = useMemo(() => getChatLocale(i18n.resolvedLanguage), [i18n.resolvedLanguage]);
  const suggestedQuestions = buildSuggestedQuestions(tx);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [availableCases, setAvailableCases] = useState<Case[]>([]);
  const [selectedDraftCase, setSelectedDraftCase] = useState<DraftCaseContext | null>(() => buildDraftCaseContextFromRoute(route.params));
  const [entrySourceContext, setEntrySourceContext] = useState<ChatEntrySourceContext>({
    sourceScreen: route.params?.sourceScreen,
    sourceAction: route.params?.sourceAction,
  });

  const refreshConversations = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const nextConversations = await chatService.listConversations();
      setConversations(nextConversations);
    } catch (historyError) {
      console.error('[ChatScreen] Error loading conversations:', historyError);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const refreshCases = useCallback(async () => {
    try {
      const response = await casesService.getCases();
      setAvailableCases(response.cases);
    } catch (casesError) {
      console.error('[ChatScreen] Error loading cases for selector:', casesError);
    }
  }, []);

  const resetConversationState = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setStreamingContent('');
    setInputText('');
    setError(null);
    setIsLoading(false);
  }, []);

  const openConversation = useCallback(async (targetConversationId: string) => {
    try {
      setIsConversationLoading(true);
      setError(null);
      setEntrySourceContext({
        sourceScreen: 'ChatScreen',
        sourceAction: 'open_chat_history',
      });
      const history = await chatService.getConversationHistory(targetConversationId);
      setMessages(history);
      setConversationId(targetConversationId);
      setStreamingContent('');
      setIsHistoryVisible(false);
    } catch (conversationError) {
      console.error('[ChatScreen] Error loading conversation:', conversationError);
      setError(tx('errors.loadConversation', 'No se pudo cargar la conversacion. Intenta de nuevo.'));
    } finally {
      setIsConversationLoading(false);
    }
  }, [tx]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    void refreshCases();
  }, [refreshCases]);

  useEffect(() => {
    const nextSeed = JSON.stringify(route.params ?? {});
    if (routeSeedRef.current === nextSeed) {
      return;
    }

    routeSeedRef.current = nextSeed;

    setSelectedDraftCase(buildDraftCaseContextFromRoute(route.params));
    setEntrySourceContext({
      sourceScreen: route.params?.sourceScreen,
      sourceAction: route.params?.sourceAction,
    });

    if (route.params?.conversationId) {
      void openConversation(route.params.conversationId);
      return;
    }

    if (route.params?.userUscisCaseId || route.params?.userEoirCaseId) {
      resetConversationState();
      setIsHistoryVisible(false);
    }
  }, [openConversation, resetConversationState, route.params]);

  const activeConversation = conversations.find((conversation) => conversation.id === conversationId);
  const activeConversationCaseContext = buildConversationCaseContext(activeConversation);
  const effectiveCaseContext = activeConversationCaseContext ?? selectedDraftCase;
  const effectiveCaseLabel = effectiveCaseContext ? getDraftCaseLabel(effectiveCaseContext, tx) : null;
  const hasConversationMemory = Boolean(conversationId && messages.length > 0);
  const sourceScreen = entrySourceContext.sourceScreen ?? 'ChatScreen';
  const sourceAction = entrySourceContext.sourceAction
    ?? (conversationId ? 'continue_chat_conversation' : 'start_chat_conversation');
  const contextSubtitle = activeConversationCaseContext
    ? tx('context.subtitle.persistedCase', 'Esta conversacion seguira usando el contexto guardado del caso.')
    : selectedDraftCase
      ? tx('context.subtitle.draftCase', 'Las conversaciones nuevas usaran este contexto hasta que lo cambies.')
      : hasConversationMemory
        ? tx('context.subtitle.threadMemory', 'El asistente esta continuando esta conversacion con memoria del hilo.')
        : tx('context.subtitle.general', 'Elige un caso opcional o empieza una conversacion general.');
  const formatMessageTimestamp = useCallback(
    (timestamp: string) => formatChatTimestamp(timestamp, locale, tx),
    [locale, tx],
  );

  /**
   * Lazily create a conversation on the backend before the first message.
   */
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const conv = await chatService.startConversation({
      userUscisCaseId: selectedDraftCase?.userUscisCaseId,
      userEoirCaseId: selectedDraftCase?.userEoirCaseId,
    });
    setConversationId(conv.id);
    setConversations((previous) => [conv, ...previous.filter((item) => item.id !== conv.id)]);
    return conv.id;
  }, [conversationId, selectedDraftCase]);

  /**
   * Auto-scroll to latest message - Requirement 13.7
   */
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      // Small delay to ensure the list has updated
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * Handle sending a message with streaming response
   * Validates: Requirements 9.1, 9.2, 9.3
   */
  const handleSendMessage = useCallback(async (
    text: string,
    sendContext?: ChatSendContextOverride,
  ) => {
    if (!text.trim()) return;

    const activeNotificationContext = getActiveNotificationContext();
    const focusedCaseId = effectiveCaseContext?.caseId;
    const focusedCaseSource = effectiveCaseContext?.caseSource;
    const resolvedSourceScreen = sendContext?.sourceScreen ?? sourceScreen;
    const resolvedSourceAction = sendContext?.sourceAction ?? sourceAction;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setError(null);
    Keyboard.dismiss();
    setIsLoading(true);
    setStreamingContent('');

    try {
      const convId = await ensureConversation();

      // Use streaming API for real-time response
      const response = await chatService.sendMessageStreaming(
        {
          message: text.trim(),
          conversationId: convId,
          appContext: {
            activeTab: 'Chat',
            currentScreen: activeNotificationContext.routeName ?? 'Chat',
            sourceScreen: resolvedSourceScreen,
            sourceAction: resolvedSourceAction,
            caseId: focusedCaseId,
            caseSource: focusedCaseSource,
          },
        },
        (chunk, done) => {
          if (!done) {
            // Update streaming content progressively
            setStreamingContent(prev => prev + chunk);
          }
        }
      );

      // Update conversation ID for future messages
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      // Add final assistant message
      setMessages((prev) => [...prev, response]);
      setStreamingContent('');
      setEntrySourceContext((previous) => ({
        sourceScreen: resolvedSourceScreen ?? previous.sourceScreen ?? 'ChatScreen',
        sourceAction: 'continue_chat_conversation',
      }));
      void refreshConversations();
    } catch (err) {
      console.error('[ChatScreen] Error sending message:', err);
      setError(tx('errors.sendMessage', 'No se pudo enviar el mensaje. Intenta de nuevo.'));

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: tx(
          'errors.assistantFallback',
          'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        ),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [effectiveCaseContext, ensureConversation, refreshConversations, sourceAction, sourceScreen, tx]);

  /**
   * Handle suggested question press
   */
  const handleQuestionPress = useCallback((question: SuggestedQuestion) => {
    setEntrySourceContext({
      sourceScreen: 'ChatScreen',
      sourceAction: 'send_suggested_question',
    });
    handleSendMessage(question.text, {
      sourceScreen: 'ChatScreen',
      sourceAction: 'send_suggested_question',
    });
  }, [handleSendMessage]);

  /**
   * Handle case context card press - Requirement 13.9
   * Navigate to case details
   */
  const handleCasePress = useCallback((caseData: Case) => {
    // Navigate to Cases tab and then push CaseDetail inside the CasesStack
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Cases',
        params: {
          screen: 'CaseDetail',
          params: { caseId: caseData.id },
        },
      })
    );
  }, [navigation]);

  /**
   * Handle send button press
   */
  const handleSendPress = useCallback(() => {
    handleSendMessage(inputText);
  }, [inputText, handleSendMessage]);

  const handleToggleHistory = useCallback(() => {
    setIsHistoryVisible((previous) => !previous);
  }, []);

  const handleStartNewConversation = useCallback(() => {
    resetConversationState();
    setIsHistoryVisible(false);
    setEntrySourceContext({
      sourceScreen: 'ChatScreen',
      sourceAction: 'start_new_chat_conversation',
    });
  }, [resetConversationState]);

  const handleSelectDraftCase = useCallback((caseContext: DraftCaseContext | null) => {
    setSelectedDraftCase(caseContext);
    setEntrySourceContext({
      sourceScreen: 'ChatScreen',
      sourceAction: caseContext ? 'select_chat_case_context' : 'clear_chat_case_context',
    });
  }, []);

  const handleSuggestedActionPress = useCallback((action: ChatSuggestedAction) => {
    if (action.targetTab === 'Cases') {
      if (action.targetCaseId) {
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Cases',
            params: {
              screen: 'CaseDetail',
              params: {
                caseId: action.targetCaseId,
                source: action.targetCaseSource,
              },
            },
          }),
        );
        return;
      }

      navigation.navigate('Cases');
      return;
    }

    navigation.navigate(action.targetTab);
  }, [navigation]);

  const draftCaseOptions = [
    {
      key: 'general',
      label: tx('context.generalOption', 'General'),
      value: null as DraftCaseContext | null,
    },
    ...availableCases.map((caseItem) => ({
      key: caseItem.id,
      label: buildDraftCaseContextFromCase(caseItem).label,
      value: buildDraftCaseContextFromCase(caseItem),
    })),
  ];

  /**
   * Render a single message item
   */
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      onCasePress={handleCasePress}
      onSuggestedActionPress={handleSuggestedActionPress}
      viewDetailsLabel={tx('message.viewDetails', 'Ver detalles')}
      formatTimestamp={formatMessageTimestamp}
    />
  ), [formatMessageTimestamp, handleCasePress, handleSuggestedActionPress, tx]);

  /**
   * Key extractor for FlatList
   */
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  /**
   * Check if chat is empty (show welcome state)
   */
  const isEmptyChat = !isConversationLoading && messages.length === 0;

  return (
    <AnimatedBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogoContainer}>
            <InmigreatLogo size={24} strokeWidth={2} />
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{tx('header.title', 'Asistente InMiGreat')}</Text>
            <Text style={styles.headerSubtitle}>
              {isLoading ? tx('header.typing', 'Escribiendo...') : tx('header.online', 'En linea')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleToggleHistory}
              activeOpacity={0.7}
            >
              <Text style={styles.headerActionButtonText}>
                {isHistoryVisible ? tx('header.closeHistory', 'Cerrar') : tx('header.openHistory', 'Historial')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionButton, styles.headerActionButtonPrimary]}
              onPress={handleStartNewConversation}
              activeOpacity={0.7}
            >
              <Text style={[styles.headerActionButtonText, styles.headerActionButtonTextPrimary]}>
                {tx('header.newConversation', 'Nueva')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contextSelectorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.contextSelectorContent}
          >
            {draftCaseOptions.map((option) => {
              const isSelected = option.value === null
                ? selectedDraftCase === null
                : option.value.caseId === selectedDraftCase?.caseId;

              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.contextSelectorChip,
                    isSelected && styles.contextSelectorChipActive,
                    conversationId && styles.contextSelectorChipDisabled,
                  ]}
                  onPress={() => handleSelectDraftCase(option.value)}
                  activeOpacity={0.75}
                  disabled={Boolean(conversationId)}
                >
                  <Text
                    style={[
                      styles.contextSelectorChipText,
                      isSelected && styles.contextSelectorChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {effectiveCaseContext || hasConversationMemory ? (
          <View style={styles.linkedContextContainer}>
            <GlassCard style={styles.linkedContextCard} opacity={0.88} blurIntensity={18}>
              <View style={styles.linkedContextHeader}>
                {effectiveCaseLabel ? (
                  <Text style={styles.linkedContextTitle}>{effectiveCaseLabel}</Text>
                ) : null}
                {hasConversationMemory ? (
                  <View style={styles.memoryBadge}>
                    <Text style={styles.memoryBadgeText}>{tx('context.memoryActive', 'Memoria activa')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.linkedContextSubtitle} numberOfLines={1}>
                {entrySourceContext.sourceScreen && entrySourceContext.sourceScreen !== 'ChatScreen' && !activeConversationCaseContext
                  ? tx('context.originPrefix', 'Origen: {{source}}', {
                    source: entrySourceContext.sourceScreen,
                  })
                  : contextSubtitle}
              </Text>
            </GlassCard>
          </View>
        ) : null}

        {isHistoryVisible ? (
          <View style={styles.historyContainer}>
            <GlassCard style={styles.historyCard} opacity={0.92} blurIntensity={20}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle}>{tx('history.title', 'Conversaciones')}</Text>
                <Text style={styles.historySubtitle}>
                  {isHistoryLoading
                    ? tx('history.loading', 'Cargando...')
                    : tx('history.savedCount', '{{value}} guardadas', { value: conversations.length })}
                </Text>
              </View>

              {isHistoryLoading ? (
                <Text style={styles.historyEmptyText}>{tx('history.loadingList', 'Cargando historial...')}</Text>
              ) : conversations.length === 0 ? (
                <Text style={styles.historyEmptyText}>{tx('history.empty', 'Todavia no hay conversaciones guardadas.')}</Text>
              ) : (
                <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                  {conversations.map((conversation) => (
                    <TouchableOpacity
                      key={conversation.id}
                      style={[
                        styles.historyItem,
                        conversation.id === conversationId && styles.historyItemActive,
                      ]}
                      onPress={() => void openConversation(conversation.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.historyItemTitle} numberOfLines={2}>
                        {formatConversationTitle(conversation, tx)}
                      </Text>
                      <Text style={styles.historyItemMeta} numberOfLines={1}>
                        {formatConversationMeta(conversation, locale)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </GlassCard>
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          keyboardVerticalOffset={0}
        >
          {/* Chat Content */}
          <View style={styles.chatContainer}>
            {isConversationLoading ? (
              <View style={styles.loadingConversationContainer}>
                <Text style={styles.loadingConversationText}>{tx('loading.conversation', 'Cargando conversacion...')}</Text>
              </View>
            ) : isEmptyChat ? (
              // Welcome state - Requirement 13.1
              <WelcomeState
                onQuestionPress={handleQuestionPress}
                title={tx('welcome.title', 'Hola, soy tu asistente')}
                subtitle={tx(
                  'welcome.subtitle',
                  'Estoy aqui para ayudarte con tus preguntas de inmigracion. Preguntame lo que necesites.',
                )}
                suggestedQuestionsTitle={tx('welcome.suggestedTitle', 'Preguntas sugeridas')}
                questions={suggestedQuestions}
              />
            ) : (
              // Message list with auto-scroll - Requirement 13.7
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
                ListFooterComponent={
                  isLoading ? (
                    <View>
                      {streamingContent ? (
                        <MessageBubble
                          message={{
                            id: 'streaming',
                            role: 'assistant',
                            content: streamingContent,
                            timestamp: new Date().toISOString(),
                          }}
                          onCasePress={handleCasePress}
                          onSuggestedActionPress={handleSuggestedActionPress}
                        />
                      ) : (
                        <TypingIndicator isVisible={true} />
                      )}
                    </View>
                  ) : null
                }
              />
            )}
          </View>

          <ChatInput
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSendPress}
            disabled={isLoading}
            placeholder={tx('input.placeholder', 'Escribe tu pregunta...')}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AnimatedBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerActionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerActionButtonPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  headerActionButtonText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  headerActionButtonTextPrimary: {
    color: colors.text.inverse,
  },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  contextSelectorContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  contextSelectorContent: {
    gap: spacing.xs,
    paddingRight: spacing.base,
  },
  contextSelectorChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  contextSelectorChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  contextSelectorChipDisabled: {
    opacity: 0.6,
  },
  contextSelectorChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  contextSelectorChipTextActive: {
    color: colors.text.inverse,
  },
  keyboardAvoid: {
    flex: 1,
  },
  linkedContextContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  linkedContextCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkedContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  linkedContextTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  linkedContextSubtitle: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  memoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: `${colors.pro}18`,
    borderWidth: 1,
    borderColor: `${colors.pro}35`,
  },
  memoryBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.pro,
  },
  historyContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  historyCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    maxHeight: 240,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  historySubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  historyList: {
    maxHeight: 180,
  },
  historyItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.large,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.xs,
  },
  historyItemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.background.secondary,
  },
  historyItemTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.primary,
  },
  historyItemMeta: {
    marginTop: 4,
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  historyEmptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  chatContainer: {
    flex: 1,
  },
  loadingConversationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingConversationText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  messageList: {
    paddingVertical: spacing.md,
  },
  
  // Welcome state styles - Requirement 13.1
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  welcomeLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.pro}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: `${colors.pro}30`,
  },
  welcomeTitle: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
  },
  suggestedQuestions: {
    width: '100%',
  },
});

export default ChatScreen;
