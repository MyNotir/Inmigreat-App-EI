/**
 * ChatScreen — Emotional Intelligence redesign.
 *
 * Warm Lexi conversation. The chat is the screen with the highest emotional
 * weight in the app — users come here when they're confused, scared, or in
 * crisis. The redesign keeps every backend interaction (streaming, history,
 * conversation context, suggested actions, case linking) but wears warm
 * skin: cream surfaces, paper-grain feel via WarmCard, clay accents, sand
 * context chips, sage memory badge, and the tone-aware MessageBubble.
 *
 * All state, handlers, conversation API calls, and routing are preserved
 * verbatim from the previous implementation. Only the visual layer changed.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { CommonActions, useNavigation, useRoute, type RouteProp } from "@react-navigation/native"
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs"

import { useViewTranslation } from "../i18n"
import { WarmScreen } from "../components/common/WarmScreen"
import { ChatInput } from "../components/chat/ChatInput"
import { MessageBubble } from "../components/chat/MessageBubble"
import { TypingIndicator } from "../components/chat/TypingIndicator"
import { SuggestedQuestions, type SuggestedQuestion } from "../components/chat/SuggestedQuestions"
import { InmigreatLogo } from "../icons"
import { casesService } from "../services/cases"
import { chatService, type Conversation } from "../services/chat"
import { getActiveNotificationContext } from "../services/notifications"
import { borderRadius, colors, spacing, typography } from "../styles/theme"
import type { Case } from "../types/case"
import type { ChatMessage, ChatSuggestedAction } from "../types/user"
import type { MainTabParamList } from "../types/navigation"

type DraftCaseContext = {
  caseId?: string
  caseSource?: "uscis" | "eoir"
  userUscisCaseId?: string
  userEoirCaseId?: string
  label?: string
}

type ChatEntrySourceContext = {
  sourceScreen?: string
  sourceAction?: string
}

type ChatSendContextOverride = {
  sourceScreen?: string
  sourceAction?: string
}

type ChatTranslate = (key: string, fallback: string, options?: Record<string, unknown>) => string

function getChatLocale(language?: string): string {
  switch (language) {
    case "en":
      return "en-US"
    case "pt":
      return "pt-BR"
    default:
      return "es-ES"
  }
}

function buildSuggestedQuestions(tx: ChatTranslate): SuggestedQuestion[] {
  return [
    { id: "processing-time", text: tx("welcome.questions.processingTime", "¿Cuánto tarda mi caso?"), icon: "⏱️" },
    { id: "documents", text: tx("welcome.questions.documents", "¿Qué documentos necesito?"), icon: "📄" },
    { id: "status", text: tx("welcome.questions.status", "¿Cómo verifico mi estado?"), icon: "🔍" },
    { id: "accelerate", text: tx("welcome.questions.accelerate", "¿Hay forma de acelerarlo?"), icon: "🚀" },
    { id: "interview", text: tx("welcome.questions.interview", "¿Cómo me preparo para la entrevista?"), icon: "💬" },
    { id: "rfe", text: tx("welcome.questions.rfe", "Recibí un RFE — ¿qué hago?"), icon: "📬" },
  ]
}

function buildDraftCaseContextFromCase(caseItem: Case): DraftCaseContext {
  return {
    caseId: caseItem.id,
    caseSource: caseItem.source,
    userUscisCaseId: caseItem.source === "uscis" ? caseItem.id : undefined,
    userEoirCaseId: caseItem.source === "eoir" ? caseItem.id : undefined,
    label:
      caseItem.source === "eoir" ? `EOIR · ${caseItem.receiptNumber}` : `USCIS · ${caseItem.receiptNumber}`,
  }
}

function buildDraftCaseContextFromRoute(params?: MainTabParamList["Chat"]): DraftCaseContext | null {
  if (!params?.userUscisCaseId && !params?.userEoirCaseId) return null
  return {
    caseId: params.caseId ?? params.userUscisCaseId ?? params.userEoirCaseId,
    caseSource: params.caseSource ?? (params.userEoirCaseId ? "eoir" : "uscis"),
    userUscisCaseId: params.userUscisCaseId,
    userEoirCaseId: params.userEoirCaseId,
  }
}

function buildConversationCaseContext(conversation?: Conversation): DraftCaseContext | null {
  if (!conversation?.userUscisCaseId && !conversation?.userEoirCaseId) return null
  return {
    caseId: conversation.userUscisCaseId ?? conversation.userEoirCaseId ?? undefined,
    caseSource: conversation.userEoirCaseId ? "eoir" : "uscis",
    userUscisCaseId: conversation.userUscisCaseId ?? undefined,
    userEoirCaseId: conversation.userEoirCaseId ?? undefined,
  }
}

function getDraftCaseLabel(caseContext: DraftCaseContext, tx: ChatTranslate): string {
  if (caseContext.label) return caseContext.label
  if (caseContext.caseSource === "eoir") return tx("context.linkedEoir", "EOIR vinculado")
  if (caseContext.caseSource === "uscis") return tx("context.linkedUscis", "USCIS vinculado")
  return tx("context.generalOption", "General")
}

function formatConversationTitle(conversation: Conversation, tx: ChatTranslate): string {
  const summary = conversation.conversationSummary?.trim()
  if (summary) return summary.length > 80 ? `${summary.slice(0, 77)}...` : summary
  if (conversation.userEoirCaseId) return tx("context.conversationLinkedEoir", "Conversación vinculada a caso EOIR")
  if (conversation.userUscisCaseId) return tx("context.conversationLinkedUscis", "Conversación vinculada a caso USCIS")
  return tx("context.conversationGeneral", "Conversación general")
}

function formatConversationMeta(conversation: Conversation, locale: string): string {
  const formattedDate = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(
    new Date(conversation.updatedAt),
  )
  if (conversation.userEoirCaseId) return `EOIR · ${formattedDate}`
  if (conversation.userUscisCaseId) return `USCIS · ${formattedDate}`
  return formattedDate
}

function formatChatTimestamp(timestamp: string, locale: string, tx: ChatTranslate): string {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return timestamp
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return tx("message.timestamp.now", "Ahora")
  if (diffMins < 60) return tx("message.timestamp.minutesAgo", "hace {{value}}m", { value: diffMins })
  if (diffHours < 24) return tx("message.timestamp.hoursAgo", "hace {{value}}h", { value: diffHours })
  if (diffDays < 7) return tx("message.timestamp.daysAgo", "hace {{value}}d", { value: diffDays })
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" })
}

interface WelcomeStateProps {
  onQuestionPress: (question: SuggestedQuestion) => void
  title: string
  greeting: string
  subtitle: string
  questions: SuggestedQuestion[]
  questionsTitle: string
}

const WelcomeState: React.FC<WelcomeStateProps> = ({
  onQuestionPress,
  title,
  greeting,
  subtitle,
  questions,
  questionsTitle,
}) => (
  <View style={styles.welcomeBlock}>
    <View style={styles.welcomeAvatar}>
      <InmigreatLogo size={42} strokeWidth={1.5} />
    </View>
    <Text style={styles.welcomeEyebrow}>{title}</Text>
    <Text style={styles.welcomeGreeting}>{greeting}</Text>
    <Text style={styles.welcomeSubtitle}>{subtitle}</Text>
    <SuggestedQuestions
      questions={questions}
      onQuestionPress={onQuestionPress}
      title={questionsTitle}
      style={styles.welcomeSuggested}
    />
  </View>
)

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>()
  const route = useRoute<RouteProp<MainTabParamList, "Chat">>()
  const flatListRef = useRef<FlatList<ChatMessage>>(null)
  const routeSeedRef = useRef<string | null>(null)
  const { t, i18n } = useViewTranslation("chat")
  const tx = useCallback<ChatTranslate>(
    (key, fallback, options) => t(key, { defaultValue: fallback, ...(options ?? {}) }),
    [t],
  )
  const locale = useMemo(() => getChatLocale(i18n.resolvedLanguage), [i18n.resolvedLanguage])
  const suggestedQuestions = buildSuggestedQuestions(tx)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState("")
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isHistoryVisible, setIsHistoryVisible] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isConversationLoading, setIsConversationLoading] = useState(false)
  const [availableCases, setAvailableCases] = useState<Case[]>([])
  const [selectedDraftCase, setSelectedDraftCase] = useState<DraftCaseContext | null>(() =>
    buildDraftCaseContextFromRoute(route.params),
  )
  const [entrySourceContext, setEntrySourceContext] = useState<ChatEntrySourceContext>({
    sourceScreen: route.params?.sourceScreen,
    sourceAction: route.params?.sourceAction,
  })

  const refreshConversations = useCallback(async () => {
    try {
      setIsHistoryLoading(true)
      const nextConversations = await chatService.listConversations()
      setConversations(nextConversations)
    } catch (historyError) {
      console.error("[ChatScreen] Error loading conversations:", historyError)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const refreshCases = useCallback(async () => {
    try {
      const response = await casesService.getCases()
      setAvailableCases(response.cases)
    } catch (casesError) {
      console.error("[ChatScreen] Error loading cases for selector:", casesError)
    }
  }, [])

  const resetConversationState = useCallback(() => {
    setConversationId(undefined)
    setMessages([])
    setStreamingContent("")
    setInputText("")
    setError(null)
    setIsLoading(false)
  }, [])

  const openConversation = useCallback(
    async (targetConversationId: string) => {
      try {
        setIsConversationLoading(true)
        setError(null)
        setEntrySourceContext({ sourceScreen: "ChatScreen", sourceAction: "open_chat_history" })
        const history = await chatService.getConversationHistory(targetConversationId)
        setMessages(history)
        setConversationId(targetConversationId)
        setStreamingContent("")
        setIsHistoryVisible(false)
      } catch (conversationError) {
        console.error("[ChatScreen] Error loading conversation:", conversationError)
        setError(tx("errors.loadConversation", "No se pudo cargar la conversación. Intenta de nuevo."))
      } finally {
        setIsConversationLoading(false)
      }
    },
    [tx],
  )

  useEffect(() => {
    void refreshConversations()
  }, [refreshConversations])

  useEffect(() => {
    void refreshCases()
  }, [refreshCases])

  useEffect(() => {
    const nextSeed = JSON.stringify(route.params ?? {})
    if (routeSeedRef.current === nextSeed) return
    routeSeedRef.current = nextSeed

    setSelectedDraftCase(buildDraftCaseContextFromRoute(route.params))
    setEntrySourceContext({
      sourceScreen: route.params?.sourceScreen,
      sourceAction: route.params?.sourceAction,
    })

    if (route.params?.conversationId) {
      void openConversation(route.params.conversationId)
      return
    }

    if (route.params?.userUscisCaseId || route.params?.userEoirCaseId) {
      resetConversationState()
      setIsHistoryVisible(false)
    }
  }, [openConversation, resetConversationState, route.params])

  const activeConversation = conversations.find((conversation) => conversation.id === conversationId)
  const activeConversationCaseContext = buildConversationCaseContext(activeConversation)
  const effectiveCaseContext = activeConversationCaseContext ?? selectedDraftCase
  const effectiveCaseLabel = effectiveCaseContext ? getDraftCaseLabel(effectiveCaseContext, tx) : null
  const hasConversationMemory = Boolean(conversationId && messages.length > 0)
  const sourceScreen = entrySourceContext.sourceScreen ?? "ChatScreen"
  const sourceAction =
    entrySourceContext.sourceAction ??
    (conversationId ? "continue_chat_conversation" : "start_chat_conversation")
  const contextSubtitle = activeConversationCaseContext
    ? tx("context.subtitle.persistedCase", "Esta conversación seguirá usando el contexto del caso.")
    : selectedDraftCase
      ? tx("context.subtitle.draftCase", "Las conversaciones nuevas usarán este contexto hasta que lo cambies.")
      : hasConversationMemory
        ? tx("context.subtitle.threadMemory", "Lexi está continuando esta conversación con memoria del hilo.")
        : tx("context.subtitle.general", "Elige un caso opcional o empieza una conversación general.")
  const formatMessageTimestamp = useCallback(
    (timestamp: string) => formatChatTimestamp(timestamp, locale, tx),
    [locale, tx],
  )

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId
    const conv = await chatService.startConversation({
      userUscisCaseId: selectedDraftCase?.userUscisCaseId,
      userEoirCaseId: selectedDraftCase?.userEoirCaseId,
    })
    setConversationId(conv.id)
    setConversations((previous) => [conv, ...previous.filter((item) => item.id !== conv.id)])
    return conv.id
  }, [conversationId, selectedDraftCase])

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = useCallback(
    async (text: string, sendContext?: ChatSendContextOverride) => {
      if (!text.trim()) return

      const activeNotificationContext = getActiveNotificationContext()
      const focusedCaseId = effectiveCaseContext?.caseId
      const focusedCaseSource = effectiveCaseContext?.caseSource
      const resolvedSourceScreen = sendContext?.sourceScreen ?? sourceScreen
      const resolvedSourceAction = sendContext?.sourceAction ?? sourceAction

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      setInputText("")
      setError(null)
      Keyboard.dismiss()
      setIsLoading(true)
      setStreamingContent("")

      try {
        const convId = await ensureConversation()

        const response = await chatService.sendMessageStreaming(
          {
            message: text.trim(),
            conversationId: convId,
            appContext: {
              activeTab: "Chat",
              currentScreen: activeNotificationContext.routeName ?? "Chat",
              sourceScreen: resolvedSourceScreen,
              sourceAction: resolvedSourceAction,
              caseId: focusedCaseId,
              caseSource: focusedCaseSource,
            },
          },
          (chunk, done) => {
            if (!done) setStreamingContent((prev) => prev + chunk)
          },
        )

        if (response.conversationId) setConversationId(response.conversationId)

        setMessages((prev) => [...prev, response])
        setStreamingContent("")
        setEntrySourceContext((previous) => ({
          sourceScreen: resolvedSourceScreen ?? previous.sourceScreen ?? "ChatScreen",
          sourceAction: "continue_chat_conversation",
        }))
        void refreshConversations()
      } catch (err) {
        console.error("[ChatScreen] Error sending message:", err)
        setError(tx("errors.sendMessage", "No se pudo enviar el mensaje. Intenta de nuevo."))

        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: tx(
            "errors.assistantFallback",
            "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
          ),
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsLoading(false)
        setStreamingContent("")
      }
    },
    [effectiveCaseContext, ensureConversation, refreshConversations, sourceAction, sourceScreen, tx],
  )

  const handleQuestionPress = useCallback(
    (question: SuggestedQuestion) => {
      setEntrySourceContext({ sourceScreen: "ChatScreen", sourceAction: "send_suggested_question" })
      handleSendMessage(question.text, {
        sourceScreen: "ChatScreen",
        sourceAction: "send_suggested_question",
      })
    },
    [handleSendMessage],
  )

  const handleCasePress = useCallback(
    (caseData: Case) => {
      navigation.dispatch(
        CommonActions.navigate({
          name: "Cases",
          params: { screen: "CaseDetail", params: { caseId: caseData.id } },
        }),
      )
    },
    [navigation],
  )

  const handleSendPress = useCallback(() => {
    handleSendMessage(inputText)
  }, [inputText, handleSendMessage])

  const handleToggleHistory = useCallback(() => {
    setIsHistoryVisible((previous) => !previous)
  }, [])

  const handleStartNewConversation = useCallback(() => {
    resetConversationState()
    setIsHistoryVisible(false)
    setEntrySourceContext({ sourceScreen: "ChatScreen", sourceAction: "start_new_chat_conversation" })
  }, [resetConversationState])

  const handleSelectDraftCase = useCallback((caseContext: DraftCaseContext | null) => {
    setSelectedDraftCase(caseContext)
    setEntrySourceContext({
      sourceScreen: "ChatScreen",
      sourceAction: caseContext ? "select_chat_case_context" : "clear_chat_case_context",
    })
  }, [])

  const handleSuggestedActionPress = useCallback(
    (action: ChatSuggestedAction) => {
      if (action.targetTab === "Cases") {
        if (action.targetCaseId) {
          navigation.dispatch(
            CommonActions.navigate({
              name: "Cases",
              params: {
                screen: "CaseDetail",
                params: { caseId: action.targetCaseId, source: action.targetCaseSource },
              },
            }),
          )
          return
        }
        navigation.navigate("Cases")
        return
      }
      navigation.navigate(action.targetTab)
    },
    [navigation],
  )

  const draftCaseOptions = [
    { key: "general", label: tx("context.generalOption", "General"), value: null as DraftCaseContext | null },
    ...availableCases.map((caseItem) => ({
      key: caseItem.id,
      label: buildDraftCaseContextFromCase(caseItem).label,
      value: buildDraftCaseContextFromCase(caseItem),
    })),
  ]

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <MessageBubble
        message={item}
        onCasePress={handleCasePress}
        onSuggestedActionPress={handleSuggestedActionPress}
        viewDetailsLabel={tx("message.viewDetails", "Ver detalles")}
        formatTimestamp={formatMessageTimestamp}
      />
    ),
    [formatMessageTimestamp, handleCasePress, handleSuggestedActionPress, tx],
  )

  const keyExtractor = useCallback((item: ChatMessage) => item.id, [])

  const isEmptyChat = !isConversationLoading && messages.length === 0

  return (
    <WarmScreen edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLogoBg}>
          <InmigreatLogo size={22} strokeWidth={2} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{tx("header.title", "Lexi")}</Text>
          <View style={styles.headerStatusRow}>
            <View style={[styles.statusDot, isLoading ? styles.statusDotTyping : styles.statusDotOnline]} />
            <Text style={styles.headerSubtitle}>
              {isLoading ? tx("header.typing", "Escribiendo...") : tx("header.online", "Aquí, contigo")}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.headerBtn} onPress={handleToggleHistory}>
            <Text style={styles.headerBtnText}>
              {isHistoryVisible ? tx("header.closeHistory", "Cerrar") : tx("header.openHistory", "Historial")}
            </Text>
          </Pressable>
          <Pressable style={[styles.headerBtn, styles.headerBtnPrimary]} onPress={handleStartNewConversation}>
            <Text style={[styles.headerBtnText, styles.headerBtnTextPrimary]}>
              {tx("header.newConversation", "Nueva")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Context selector chips */}
      <View style={styles.contextSelectorWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.contextSelectorContent}
        >
          {draftCaseOptions.map((option) => {
            const isSelected =
              option.value === null
                ? selectedDraftCase === null
                : option.value.caseId === selectedDraftCase?.caseId

            return (
              <Pressable
                key={option.key}
                style={[
                  styles.contextChip,
                  isSelected && styles.contextChipActive,
                  conversationId && styles.contextChipDisabled,
                ]}
                onPress={() => handleSelectDraftCase(option.value)}
                disabled={Boolean(conversationId)}
              >
                <Text style={[styles.contextChipText, isSelected && styles.contextChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* Linked context strip */}
      {effectiveCaseContext || hasConversationMemory ? (
        <View style={styles.linkedContextWrap}>
          <View style={styles.linkedContextCard}>
            <View style={styles.linkedContextHeader}>
              {effectiveCaseLabel ? <Text style={styles.linkedContextTitle}>{effectiveCaseLabel}</Text> : null}
              {hasConversationMemory ? (
                <View style={styles.memoryBadge}>
                  <Text style={styles.memoryBadgeText}>
                    {tx("context.memoryActive", "Memoria activa")}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.linkedContextSubtitle} numberOfLines={1}>
              {entrySourceContext.sourceScreen &&
              entrySourceContext.sourceScreen !== "ChatScreen" &&
              !activeConversationCaseContext
                ? tx("context.originPrefix", "Origen: {{source}}", { source: entrySourceContext.sourceScreen })
                : contextSubtitle}
            </Text>
          </View>
        </View>
      ) : null}

      {/* History panel */}
      {isHistoryVisible ? (
        <View style={styles.historyWrap}>
          <View style={styles.historyCard}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyTitle}>{tx("history.title", "Conversaciones")}</Text>
              <Text style={styles.historySubtitle}>
                {isHistoryLoading
                  ? tx("history.loading", "Cargando...")
                  : tx("history.savedCount", "{{value}} guardadas", { value: conversations.length })}
              </Text>
            </View>

            {isHistoryLoading ? (
              <Text style={styles.historyEmptyText}>
                {tx("history.loadingList", "Cargando historial...")}
              </Text>
            ) : conversations.length === 0 ? (
              <Text style={styles.historyEmptyText}>
                {tx("history.empty", "Todavía no hay conversaciones guardadas.")}
              </Text>
            ) : (
              <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {conversations.map((conversation) => (
                  <Pressable
                    key={conversation.id}
                    style={[
                      styles.historyItem,
                      conversation.id === conversationId && styles.historyItemActive,
                    ]}
                    onPress={() => void openConversation(conversation.id)}
                  >
                    <Text style={styles.historyItemTitle} numberOfLines={2}>
                      {formatConversationTitle(conversation, tx)}
                    </Text>
                    <Text style={styles.historyItemMeta} numberOfLines={1}>
                      {formatConversationMeta(conversation, locale)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.kbWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        enabled={Platform.OS === "ios"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.chatContainer}>
          {isConversationLoading ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>
                {tx("loading.conversation", "Abriendo conversación...")}
              </Text>
            </View>
          ) : isEmptyChat ? (
            <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
              <WelcomeState
                onQuestionPress={handleQuestionPress}
                title={tx("welcome.eyebrow", "LEXI · TU ASISTENTE LEGAL")}
                greeting={tx("welcome.title", "Hola. Cuéntame qué pasó.")}
                subtitle={tx(
                  "welcome.subtitle",
                  "Te respondo en español claro, sin jerga legal. Si la cosa se pone seria, te conecto con un abogado humano.",
                )}
                questionsTitle={tx("welcome.suggestedTitle", "O empieza por aquí")}
                questions={suggestedQuestions}
              />
            </ScrollView>
          ) : (
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
                          id: "streaming",
                          role: "assistant",
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

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSendPress}
          disabled={isLoading}
          placeholder={tx("input.placeholder", "Cuéntame qué necesitas...")}
        />
      </KeyboardAvoidingView>
    </WarmScreen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerLogoBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: -0.2,
  },
  headerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs + 2,
  },
  statusDotOnline: {
    backgroundColor: colors.success,
  },
  statusDotTyping: {
    backgroundColor: colors.accent,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  headerBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headerBtnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  headerBtnText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: 0.4,
  },
  headerBtnTextPrimary: {
    color: colors.background.primary,
  },

  contextSelectorWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  contextSelectorContent: {
    gap: spacing.xs + 2,
    paddingRight: spacing.lg,
  },
  contextChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  contextChipActive: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.accent,
  },
  contextChipDisabled: {
    opacity: 0.5,
  },
  contextChipText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.secondary,
    letterSpacing: 0.3,
  },
  contextChipTextActive: {
    color: colors.text.primary,
    fontFamily: typography.fontFamily.extrabold,
  },

  linkedContextWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  linkedContextCard: {
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
    borderWidth: 1,
    borderRadius: borderRadius.large,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  linkedContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  linkedContextTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    flex: 1,
  },
  linkedContextSubtitle: {
    marginTop: 2,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },
  memoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(184, 201, 185, 0.4)",
    borderWidth: 1,
    borderColor: colors.success,
  },
  memoryBadgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.success,
    letterSpacing: 0.3,
  },

  historyWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  historyCard: {
    backgroundColor: colors.background.primary,
    borderColor: colors.border.light,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    maxHeight: 240,
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  historyTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    letterSpacing: 0.2,
  },
  historySubtitle: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
  },
  historyList: {
    maxHeight: 180,
  },
  historyItem: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.large,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.xs + 2,
  },
  historyItemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.background.secondary,
  },
  historyItemTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
  historyItemMeta: {
    marginTop: 4,
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.tertiary,
  },
  historyEmptyText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
  },

  kbWrap: { flex: 1 },

  chatContainer: { flex: 1 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: "center",
  },
  messageList: { paddingVertical: spacing.md },

  welcomeScroll: { flexGrow: 1, justifyContent: "center" },
  welcomeBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  welcomeAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    shadowColor: colors.text.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  welcomeEyebrow: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.extrabold,
    color: colors.accent,
    letterSpacing: 1.6,
    marginBottom: spacing.md,
  },
  welcomeGreeting: {
    fontSize: typography.fontSize["2xl"],
    fontFamily: typography.fontFamily.extrabold,
    color: colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.4,
    marginBottom: spacing.md,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSize.md * 1.45,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  welcomeSuggested: {
    width: "100%",
  },

  errorBanner: {
    backgroundColor: "rgba(167, 90, 63, 0.12)",
    borderTopWidth: 1,
    borderTopColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.error,
    textAlign: "center",
  },
})

export default ChatScreen
