import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import type { EoirCaptchaModalControllerProps } from '../../hooks/useEoirCaptchaChallenge';
import { useViewTranslation } from '../../i18n';
import { ApiException } from '../../services/api';
import {
  buildEoirHcaptchaApiUrls,
  EOIR_HCAPTCHA_LOAD_TIMEOUT_MS,
  EOIR_HCAPTCHA_ORIGIN,
  EOIR_HCAPTCHA_SITE_KEY,
} from '../../services/eoir';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

interface EoirCaptchaBridgeMessage {
  type: string;
  attempt?: number;
  code?: string;
  message?: string;
  token?: string;
  url?: string;
}

interface EoirCaptchaHtmlConfig {
  apiUrls: string[];
  languageCode: string;
  sessionId: string;
  siteKey: string;
}

const HCAPTCHA_SCRIPT_RETRY_WAIT_MS = 4500;

type CasesTranslate = (
  key: string,
  defaultValue: string,
  options?: Record<string, unknown>,
) => string;

function getHcaptchaLanguageCode(language: string | undefined): 'es' | 'en' | 'pt' {
  const normalized = language?.trim().toLowerCase() ?? 'es';

  if (normalized.startsWith('en')) {
    return 'en';
  }

  if (normalized.startsWith('pt')) {
    return 'pt';
  }

  return 'es';
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function createCaptchaApiException(
  message: string,
  type: 'validation_error' | 'network_error' | 'timeout_error',
  code: number,
  requestPrefix: string,
): ApiException {
  return new ApiException({
    type,
    code,
    message,
    requestId: `${requestPrefix}_${Date.now()}`,
  });
}

function buildHcaptchaHtml(config: EoirCaptchaHtmlConfig): string {
  const serializedConfig = serializeForInlineScript(config);

  return `<!DOCTYPE html>
<html lang="${config.languageCode}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #app {
        width: 100%;
        min-height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #hcaptcha-container {
        width: 100%;
        min-height: 320px;
      }
    </style>
    <script>
      var eoirCaptchaConfig = ${serializedConfig};
      var hcaptchaWidgetId = null;
      var hasRenderedCaptcha = false;
      var activeScriptIndex = -1;
      var activeScriptElement = null;
      var activeScriptLoadTimer = null;

      function postBridgeMessage(type, payload) {
        var message = Object.assign(
          {
            type: type,
            sessionId: eoirCaptchaConfig.sessionId,
          },
          payload || {}
        );

        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }

      function clearScriptLoadTimer() {
        if (activeScriptLoadTimer !== null) {
          clearTimeout(activeScriptLoadTimer);
          activeScriptLoadTimer = null;
        }
      }

      function removeActiveScriptElement() {
        if (activeScriptElement && activeScriptElement.parentNode) {
          activeScriptElement.parentNode.removeChild(activeScriptElement);
        }

        activeScriptElement = null;
      }

      function onCaptchaSuccess(token) {
        postBridgeMessage('success', { token: token });
      }

      function onCaptchaOpen() {
        postBridgeMessage('open');
      }

      function onCaptchaClose() {
        postBridgeMessage('challenge-closed');
      }

      function onCaptchaExpired() {
        postBridgeMessage('expired');
      }

      function onCaptchaChallengeExpired() {
        postBridgeMessage('challenge-expired');
      }

      function onCaptchaError(error) {
        var message = 'hCaptcha devolvio un error.';
        var code = 'error';

        if (typeof error === 'string') {
          message = error;
          code = error;
        } else if (error && typeof error === 'object') {
          message = String(error.message || error.error || error.name || message);
          code = String(error.error || error.name || code);
        }

        postBridgeMessage('error', {
          code: code,
          message: message,
        });
      }

      function executeCaptcha() {
        try {
          if (hcaptchaWidgetId === null || typeof window.hcaptcha === 'undefined') {
            onCaptchaError({ error: 'execute-error', message: 'Widget no disponible para ejecutar.' });
            return;
          }

          window.hcaptcha.execute();
        } catch (error) {
          onCaptchaError({ error: 'execute-error', message: error && error.message ? error.message : String(error) });
        }
      }

      function renderCaptcha() {
        if (hasRenderedCaptcha) {
          return;
        }

        hasRenderedCaptcha = true;
        clearScriptLoadTimer();

        try {
          hcaptchaWidgetId = window.hcaptcha.render('hcaptcha-container', {
            sitekey: eoirCaptchaConfig.siteKey,
            size: 'invisible',
            theme: 'light',
            callback: onCaptchaSuccess,
            'open-callback': onCaptchaOpen,
            'close-callback': onCaptchaClose,
            'expired-callback': onCaptchaExpired,
            'chalexpired-callback': onCaptchaChallengeExpired,
            'error-callback': onCaptchaError,
          });

          postBridgeMessage('loaded');
          setTimeout(executeCaptcha, 0);
        } catch (error) {
          hasRenderedCaptcha = false;
          if (activeScriptIndex + 1 < eoirCaptchaConfig.apiUrls.length) {
            loadScriptAtIndex(activeScriptIndex + 1);
            return;
          }

          onCaptchaError({ error: 'render-error', message: error && error.message ? error.message : String(error) });
        }
      }

      function waitForHcaptchaReady(scriptIndex, retriesRemaining) {
        if (window.hcaptcha && typeof window.hcaptcha.render === 'function') {
          renderCaptcha();
          return;
        }

        if (retriesRemaining <= 0) {
          loadScriptAtIndex(scriptIndex + 1);
          return;
        }

        setTimeout(function() {
          waitForHcaptchaReady(scriptIndex, retriesRemaining - 1);
        }, 150);
      }

      function loadScriptAtIndex(scriptIndex) {
        clearScriptLoadTimer();
        removeActiveScriptElement();
        activeScriptIndex = scriptIndex;

        var nextUrl = eoirCaptchaConfig.apiUrls[scriptIndex];
        if (!nextUrl) {
          postBridgeMessage('error', {
            code: 'script-error',
            message: 'No pudimos cargar api.js de hCaptcha.',
          });
          return;
        }

        postBridgeMessage('script-attempt', {
          attempt: scriptIndex + 1,
          url: nextUrl,
        });

        activeScriptElement = document.createElement('script');
        activeScriptElement.src = nextUrl;
        activeScriptElement.async = true;
        activeScriptElement.defer = true;
        activeScriptElement.onload = function() {
          clearScriptLoadTimer();
          waitForHcaptchaReady(scriptIndex, 20);
        };
        activeScriptElement.onerror = function() {
          loadScriptAtIndex(scriptIndex + 1);
        };

        document.head.appendChild(activeScriptElement);
        activeScriptLoadTimer = setTimeout(function() {
          loadScriptAtIndex(scriptIndex + 1);
        }, ${HCAPTCHA_SCRIPT_RETRY_WAIT_MS});
      }

      document.addEventListener('DOMContentLoaded', function() {
        postBridgeMessage('loading');
        loadScriptAtIndex(0);
      });
    </script>
  </head>
  <body>
    <div id="app">
      <div id="hcaptcha-container"></div>
    </div>
  </body>
</html>`;
}

function parseBridgeMessage(rawMessage: string): EoirCaptchaBridgeMessage | null {
  try {
    const parsed = JSON.parse(rawMessage) as EoirCaptchaBridgeMessage;
    return typeof parsed?.type === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function mapBridgeError(message: EoirCaptchaBridgeMessage, tx: CasesTranslate): ApiException {
  const normalizedCode = message.code?.trim().toLowerCase() ?? '';
  const normalizedMessage = message.message?.trim().toLowerCase() ?? '';

  if (normalizedCode === 'script-error') {
    return createCaptchaApiException(
      tx('captcha.errors.loadTimeout', 'No pudimos cargar hCaptcha en el dispositivo. Revisa tu conexion e intenta de nuevo.'),
      'network_error',
      0,
      'eoir_captcha_script',
    );
  }

  if (normalizedCode === 'network-error' || normalizedMessage.includes('network')) {
    return createCaptchaApiException(
      tx('captcha.errors.network', 'La conexion no permitio iniciar hCaptcha correctamente. Intenta de nuevo.'),
      'network_error',
      0,
      'eoir_captcha_network',
    );
  }

  if (
    normalizedCode === 'render-error' ||
    normalizedCode === 'execute-error' ||
    normalizedCode === 'missing-widget'
  ) {
    return createCaptchaApiException(
      tx('captcha.errors.runtime', 'hCaptcha no pudo iniciar correctamente en este dispositivo. Intenta de nuevo.'),
      'network_error',
      0,
      'eoir_captcha_runtime',
    );
  }

  return createCaptchaApiException(
    tx('captcha.errors.generic', 'hCaptcha no pudo completarse en este momento. Intenta de nuevo.'),
    'network_error',
    0,
    'eoir_captcha_error',
  );
}

export const EoirCaptchaModal: React.FC<EoirCaptchaModalControllerProps> = ({
  visible,
  challengeKey,
  onSuccess,
  onCancel,
  onError,
}) => {
  const { t, i18n } = useViewTranslation('cases');
  const tx = (key: string, defaultValue: string, options?: Record<string, unknown>) =>
    t(key, { defaultValue, ...(options ?? {}) });
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSettledRef = useRef(false);
  const hcaptchaLanguageCode = getHcaptchaLanguageCode(i18n.resolvedLanguage);
  const [statusMessage, setStatusMessage] = useState<string | null>(() =>
    tx('captcha.loading', 'Cargando verificacion humana...'),
  );

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const settleSuccess = useCallback((token: string) => {
    if (hasSettledRef.current) {
      return;
    }

    hasSettledRef.current = true;
    clearLoadTimeout();
    setStatusMessage(null);
    onSuccess(token);
  }, [clearLoadTimeout, onSuccess]);

  const settleError = useCallback((error: ApiException) => {
    if (hasSettledRef.current) {
      return;
    }

    hasSettledRef.current = true;
    clearLoadTimeout();
    setStatusMessage(null);
    onError(error);
  }, [clearLoadTimeout, onError]);

  const handleCancel = useCallback(() => {
    if (hasSettledRef.current) {
      return;
    }

    hasSettledRef.current = true;
    clearLoadTimeout();
    setStatusMessage(null);
    onCancel();
  }, [clearLoadTimeout, onCancel]);

  const htmlSource = useMemo(() => {
    const sessionId = `eoir_${challengeKey}`;

    return {
      html: buildHcaptchaHtml({
        apiUrls: buildEoirHcaptchaApiUrls(hcaptchaLanguageCode),
        languageCode: hcaptchaLanguageCode,
        sessionId,
        siteKey: EOIR_HCAPTCHA_SITE_KEY,
      }),
      baseUrl: EOIR_HCAPTCHA_ORIGIN,
    };
  }, [challengeKey, hcaptchaLanguageCode]);

  useEffect(() => {
    if (!visible) {
      clearLoadTimeout();
      hasSettledRef.current = false;
      setStatusMessage(tx('captcha.loading', 'Cargando verificacion humana...'));
      return;
    }

    hasSettledRef.current = false;
    setStatusMessage(tx('captcha.loading', 'Cargando verificacion humana...'));
    clearLoadTimeout();

    loadTimeoutRef.current = setTimeout(() => {
      settleError(
        createCaptchaApiException(
          tx('captcha.errors.loadTimeout', 'No pudimos cargar hCaptcha en el dispositivo. Revisa tu conexion e intenta de nuevo.'),
          'timeout_error',
          504,
          'eoir_captcha_timeout',
        ),
      );
    }, EOIR_HCAPTCHA_LOAD_TIMEOUT_MS);

    return () => {
      clearLoadTimeout();
    };
  }, [challengeKey, clearLoadTimeout, settleError, tx, visible]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    const bridgeMessage = parseBridgeMessage(event.nativeEvent.data);

    if (!bridgeMessage) {
      return;
    }

    const safeBridgeMessage = bridgeMessage.token
      ? {
          ...bridgeMessage,
          token: `[redacted:${bridgeMessage.token.length}]`,
        }
      : bridgeMessage;

    console.log('[EOIR][hCaptcha]', safeBridgeMessage);

    switch (bridgeMessage.type) {
      case 'loading':
        setStatusMessage(tx('captcha.loading', 'Cargando verificacion humana...'));
        return;
      case 'script-attempt':
        setStatusMessage(
          bridgeMessage.attempt && bridgeMessage.attempt > 1
            ? tx('captcha.retryingLoad', 'Reintentando la carga de hCaptcha...')
            : tx('captcha.connecting', 'Conectando la verificacion humana...')
        );
        return;
      case 'loaded':
        clearLoadTimeout();
        setStatusMessage(tx('captcha.preparing', 'Preparando challenge de verificacion...'));
        return;
      case 'open':
        clearLoadTimeout();
        setStatusMessage(null);
        return;
      case 'success':
        if (!bridgeMessage.token) {
          settleError(
            createCaptchaApiException(
              tx('captcha.errors.emptyResponse', 'hCaptcha devolvio una respuesta vacia. Intenta de nuevo.'),
              'network_error',
              0,
              'eoir_captcha_empty',
            ),
          );
          return;
        }

        settleSuccess(bridgeMessage.token);
        return;
      case 'challenge-closed':
        handleCancel();
        return;
      case 'expired':
      case 'challenge-expired':
        settleError(
          createCaptchaApiException(
            tx('captcha.errors.expired', 'La verificacion humana expiro antes de completarse. Intenta de nuevo.'),
            'timeout_error',
            408,
            'eoir_captcha_expired',
          ),
        );
        return;
      case 'error':
        settleError(mapBridgeError(bridgeMessage, tx));
        return;
      default:
        settleError(
          createCaptchaApiException(
            tx('captcha.errors.unexpectedEvent', 'hCaptcha devolvio un evento inesperado. Intenta de nuevo.'),
            'network_error',
            0,
            'eoir_captcha_unexpected',
          ),
        );
    }
  }, [clearLoadTimeout, handleCancel, settleError, settleSuccess, tx]);

  const handleLoadingError = useCallback((event: any) => {
    settleError(
      createCaptchaApiException(
        event?.nativeEvent?.description?.toString().trim()
          ? tx('captcha.errors.openView', 'No pudimos abrir la vista de hCaptcha en el dispositivo. Intenta de nuevo.')
          : tx('captcha.errors.openDevice', 'No pudimos abrir hCaptcha en el dispositivo. Intenta de nuevo.'),
        'network_error',
        0,
        'eoir_captcha_webview',
      ),
    );
  }, [settleError, tx]);

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={handleCancel} transparent visible>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{tx('captcha.title', 'Verificacion humana')}</Text>
          <Text style={styles.description}>
            {statusMessage ?? tx('captcha.complete', 'Completa el challenge para consultar EOIR.')}
          </Text>

          <View style={styles.widgetContainer}>
            <WebView
              key={challengeKey}
              allowsInlineMediaPlayback
              cacheEnabled
              domStorageEnabled
              mixedContentMode="always"
              onError={handleLoadingError}
              onMessage={handleMessage}
              originWhitelist={['*']}
              javaScriptEnabled
              setSupportMultipleWindows={false}
              sharedCookiesEnabled
              source={htmlSource}
              style={styles.webView}
              thirdPartyCookiesEnabled
            />
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>{tx('captcha.cancel', 'Cancelar')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
    backgroundColor: 'rgba(17, 24, 39, 0.28)',
  },
  card: {
    minHeight: 440,
    maxHeight: '84%',
    borderRadius: borderRadius['3xl'],
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  widgetContainer: {
    flex: 1,
    minHeight: 320,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cancelButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semibold,
    color: colors.text.primary,
  },
});

export default EoirCaptchaModal;