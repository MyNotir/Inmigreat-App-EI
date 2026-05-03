import { ApiException } from '../services/api';
import { GraphQLException } from '../services/graphql';
import type { AppAlertConfig, ErrorAlertOptions } from '../types/alerts';

function normalizeMessage(message?: string, fallback?: string): string {
  const trimmed = message?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback || 'Ocurrió un error inesperado.';
}

function containsText(message: string, value: string): boolean {
  return message.toLowerCase().includes(value);
}

function isPrismaEmailConstraintError(message: string): boolean {
  return containsText(message, 'unique constraint failed') && containsText(message, 'email');
}

function buildApiAlert(error: ApiException, options?: ErrorAlertOptions): AppAlertConfig | null {
  const message = normalizeMessage(error.message, options?.fallbackMessage);

  if (error.type === 'validation_error' && error.details && options?.preferInlineValidation) {
    return null;
  }

  if (containsText(message, 'no encontramos una cuenta')) {
    return {
      title: 'Cuenta no encontrada',
      message,
      tone: 'warning',
    };
  }

  if (containsText(message, 'confirmar tu correo')) {
    return {
      title: 'Confirma tu correo',
      message,
      tone: 'info',
    };
  }

  if (containsText(message, 'credenciales inválidas')) {
    return {
      title: 'Correo o contraseña incorrectos',
      message,
      tone: 'warning',
    };
  }

  if (containsText(message, 'demasiados intentos')) {
    return {
      title: 'Demasiados intentos',
      message,
      tone: 'warning',
    };
  }

  switch (error.type) {
    case 'network_error':
      return {
        title: 'Sin conexión',
        message,
        tone: 'warning',
      };
    case 'timeout_error':
      return {
        title: 'Conexión lenta',
        message,
        tone: 'warning',
      };
    case 'auth_error':
      return {
        title: 'Problema de autenticación',
        message,
        tone: 'warning',
      };
    case 'validation_error':
      return {
        title: options?.title || 'Revisa los datos',
        message,
        tone: 'info',
      };
    case 'server_error':
    default:
      return {
        title: options?.title || 'Algo salió mal',
        message,
        tone: 'error',
      };
  }
}

function buildGraphQLAlert(error: GraphQLException, options?: ErrorAlertOptions): AppAlertConfig {
  const rawMessage = normalizeMessage(error.message, options?.fallbackMessage);

  if (isPrismaEmailConstraintError(rawMessage)) {
    return {
      title: 'Correo ya registrado',
      message:
        'Ya existe un perfil asociado a ese correo en este entorno. Revisa la sincronización entre Cognito y la base local antes de volver a intentar.',
      tone: 'warning',
    };
  }

  if (containsText(rawMessage, 'no token provided')) {
    return {
      title: 'Sesión inválida',
      message: 'No pudimos validar tu sesión actual. Intenta cerrar sesión y volver a entrar.',
      tone: 'warning',
    };
  }

  switch (error.type) {
    case 'network_error':
      return {
        title: 'Sin conexión',
        message: rawMessage,
        tone: 'warning',
      };
    case 'timeout_error':
      return {
        title: 'Conexión lenta',
        message: rawMessage,
        tone: 'warning',
      };
    case 'auth_error':
      return {
        title: 'Sesión inválida',
        message: rawMessage,
        tone: 'warning',
      };
    case 'graphql_error':
    case 'server_error':
    default:
      return {
        title: options?.title || 'No pudimos completar la acción',
        message: options?.fallbackMessage || rawMessage,
        tone: 'error',
      };
  }
}

export function buildAlertFromError(
  error: unknown,
  options?: ErrorAlertOptions,
): AppAlertConfig | null {
  if (error instanceof ApiException) {
    return buildApiAlert(error, options);
  }

  if (error instanceof GraphQLException) {
    return buildGraphQLAlert(error, options);
  }

  if (error instanceof Error) {
    return {
      title: options?.title || 'No pudimos completar la acción',
      message: normalizeMessage(error.message, options?.fallbackMessage),
      tone: 'error',
    };
  }

  return {
    title: options?.title || 'No pudimos completar la acción',
    message: normalizeMessage(undefined, options?.fallbackMessage),
    tone: 'error',
  };
}