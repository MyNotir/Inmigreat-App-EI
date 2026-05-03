import type { NamespaceTranslations } from '../types';

export const chatTranslations: NamespaceTranslations = {
  es: {
    header: {
      title: 'Asistente InMiGreat',
      online: 'En linea',
      typing: 'Escribiendo...',
      openHistory: 'Historial',
      closeHistory: 'Cerrar',
      newConversation: 'Nueva',
    },
    welcome: {
      title: 'Hola, soy tu asistente',
      subtitle: 'Estoy aqui para ayudarte con tus preguntas de inmigracion. Preguntame lo que necesites.',
      suggestedTitle: 'Preguntas sugeridas',
      questions: {
        processingTime: 'Cuanto tiempo tarda el proceso de mi caso?',
        documents: 'Que documentos necesito preparar?',
        status: 'Como puedo verificar el estado de mi caso?',
        accelerate: 'Hay formas de acelerar mi proceso?',
        interview: 'Como me preparo para la entrevista?',
        rfe: 'Que hago si recibo un RFE?',
      },
    },
    context: {
      linkedEoir: 'EOIR vinculado',
      linkedUscis: 'USCIS vinculado',
      conversationLinkedEoir: 'Conversacion vinculada a caso EOIR',
      conversationLinkedUscis: 'Conversacion vinculada a caso USCIS',
      conversationGeneral: 'Conversacion general',
      memoryActive: 'Memoria activa',
      originPrefix: 'Origen: {{source}}',
      generalOption: 'General',
      subtitle: {
        persistedCase: 'Esta conversacion seguira usando el contexto guardado del caso.',
        draftCase: 'Las conversaciones nuevas usaran este contexto hasta que lo cambies.',
        threadMemory: 'El asistente esta continuando esta conversacion con memoria del hilo.',
        general: 'Elige un caso opcional o empieza una conversacion general.',
      },
    },
    history: {
      title: 'Conversaciones',
      loading: 'Cargando...',
      savedCount: '{{value}} guardadas',
      loadingList: 'Cargando historial...',
      empty: 'Todavia no hay conversaciones guardadas.',
    },
    loading: {
      conversation: 'Cargando conversacion...',
    },
    errors: {
      loadConversation: 'No se pudo cargar la conversacion. Intenta de nuevo.',
      sendMessage: 'No se pudo enviar el mensaje. Intenta de nuevo.',
      assistantFallback: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
    },
    input: {
      placeholder: 'Escribe tu pregunta...',
    },
    message: {
      viewDetails: 'Ver detalles',
      timestamp: {
        now: 'Ahora',
        minutesAgo: 'hace {{value}}m',
        hoursAgo: 'hace {{value}}h',
        daysAgo: 'hace {{value}}d',
      },
    },
  },
  en: {
    header: {
      title: 'InMiGreat Assistant',
      online: 'Online',
      typing: 'Typing...',
      openHistory: 'History',
      closeHistory: 'Close',
      newConversation: 'New',
    },
    welcome: {
      title: 'Hi, I am your assistant',
      subtitle: 'I am here to help with your immigration questions. Ask me whatever you need.',
      suggestedTitle: 'Suggested questions',
      questions: {
        processingTime: 'How long does my case process usually take?',
        documents: 'What documents should I prepare?',
        status: 'How can I check my case status?',
        accelerate: 'Are there ways to speed up my process?',
        interview: 'How should I prepare for the interview?',
        rfe: 'What should I do if I receive an RFE?',
      },
    },
    context: {
      linkedEoir: 'Linked EOIR',
      linkedUscis: 'Linked USCIS',
      conversationLinkedEoir: 'Conversation linked to EOIR case',
      conversationLinkedUscis: 'Conversation linked to USCIS case',
      conversationGeneral: 'General conversation',
      memoryActive: 'Memory active',
      originPrefix: 'Origin: {{source}}',
      generalOption: 'General',
      subtitle: {
        persistedCase: 'This conversation will keep using the saved case context.',
        draftCase: 'New conversations will use this context until you change it.',
        threadMemory: 'The assistant is continuing this conversation with thread memory.',
        general: 'Pick an optional case or start a general conversation.',
      },
    },
    history: {
      title: 'Conversations',
      loading: 'Loading...',
      savedCount: '{{value}} saved',
      loadingList: 'Loading history...',
      empty: 'There are no saved conversations yet.',
    },
    loading: {
      conversation: 'Loading conversation...',
    },
    errors: {
      loadConversation: 'The conversation could not be loaded. Please try again.',
      sendMessage: 'The message could not be sent. Please try again.',
      assistantFallback: 'Sorry, there was an error processing your message. Please try again.',
    },
    input: {
      placeholder: 'Type your question...',
    },
    message: {
      viewDetails: 'View details',
      timestamp: {
        now: 'Now',
        minutesAgo: '{{value}}m ago',
        hoursAgo: '{{value}}h ago',
        daysAgo: '{{value}}d ago',
      },
    },
  },
  pt: {
    header: {
      title: 'Assistente InMiGreat',
      online: 'Online',
      typing: 'Digitando...',
      openHistory: 'Historico',
      closeHistory: 'Fechar',
      newConversation: 'Nova',
    },
    welcome: {
      title: 'Ola, sou seu assistente',
      subtitle: 'Estou aqui para ajudar com suas perguntas sobre imigracao. Pergunte o que precisar.',
      suggestedTitle: 'Perguntas sugeridas',
      questions: {
        processingTime: 'Quanto tempo o processo do meu caso costuma levar?',
        documents: 'Quais documentos preciso preparar?',
        status: 'Como posso verificar o status do meu caso?',
        accelerate: 'Existem formas de acelerar meu processo?',
        interview: 'Como devo me preparar para a entrevista?',
        rfe: 'O que faco se eu receber um RFE?',
      },
    },
    context: {
      linkedEoir: 'EOIR vinculado',
      linkedUscis: 'USCIS vinculado',
      conversationLinkedEoir: 'Conversa vinculada ao caso EOIR',
      conversationLinkedUscis: 'Conversa vinculada ao caso USCIS',
      conversationGeneral: 'Conversa geral',
      memoryActive: 'Memoria ativa',
      originPrefix: 'Origem: {{source}}',
      generalOption: 'Geral',
      subtitle: {
        persistedCase: 'Esta conversa continuara usando o contexto salvo do caso.',
        draftCase: 'Novas conversas usarao este contexto ate voce muda-lo.',
        threadMemory: 'O assistente esta continuando esta conversa com memoria do fio.',
        general: 'Escolha um caso opcional ou inicie uma conversa geral.',
      },
    },
    history: {
      title: 'Conversas',
      loading: 'Carregando...',
      savedCount: '{{value}} salvas',
      loadingList: 'Carregando historico...',
      empty: 'Ainda nao ha conversas salvas.',
    },
    loading: {
      conversation: 'Carregando conversa...',
    },
    errors: {
      loadConversation: 'Nao foi possivel carregar a conversa. Tente novamente.',
      sendMessage: 'Nao foi possivel enviar a mensagem. Tente novamente.',
      assistantFallback: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
    },
    input: {
      placeholder: 'Escreva sua pergunta...',
    },
    message: {
      viewDetails: 'Ver detalhes',
      timestamp: {
        now: 'Agora',
        minutesAgo: 'ha {{value}}m',
        hoursAgo: 'ha {{value}}h',
        daysAgo: 'ha {{value}}d',
      },
    },
  },
};