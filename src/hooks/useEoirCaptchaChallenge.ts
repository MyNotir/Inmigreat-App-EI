import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiException } from '../services/api';

interface PendingCaptchaRequest {
  resolve: (token: string) => void;
  reject: (error: ApiException) => void;
}

export interface EoirCaptchaModalControllerProps {
  visible: boolean;
  challengeKey: number;
  onSuccess: (token: string) => void;
  onCancel: () => void;
  onError: (error: ApiException) => void;
}

interface UseEoirCaptchaChallengeResult {
  requestToken: () => Promise<string>;
  modalProps: EoirCaptchaModalControllerProps;
}

function createCaptchaApiException(
  message: string,
  type: 'validation_error' | 'network_error' | 'timeout_error' = 'validation_error',
  code = 400,
  requestPrefix = 'eoir_captcha',
): ApiException {
  return new ApiException({
    type,
    code,
    message,
    requestId: `${requestPrefix}_${Date.now()}`,
  });
}

export function useEoirCaptchaChallenge(): UseEoirCaptchaChallengeResult {
  const pendingRequestRef = useRef<PendingCaptchaRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const [challengeKey, setChallengeKey] = useState(0);

  const settleRequest = useCallback((settler: (pending: PendingCaptchaRequest) => void) => {
    const pendingRequest = pendingRequestRef.current;
    pendingRequestRef.current = null;
    setVisible(false);

    if (!pendingRequest) {
      return;
    }

    settler(pendingRequest);
  }, []);

  const handleSuccess = useCallback((token: string) => {
    settleRequest((pendingRequest) => {
      pendingRequest.resolve(token);
    });
  }, [settleRequest]);

  const handleError = useCallback((error: ApiException) => {
    settleRequest((pendingRequest) => {
      pendingRequest.reject(error);
    });
  }, [settleRequest]);

  const handleCancel = useCallback(() => {
    handleError(
      createCaptchaApiException(
        'La verificacion humana se cancelo antes de completarse.',
        'validation_error',
        400,
        'eoir_captcha_cancel',
      ),
    );
  }, [handleError]);

  const requestToken = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      if (pendingRequestRef.current) {
        pendingRequestRef.current.reject(
          createCaptchaApiException(
            'Ya hay una verificacion humana en curso. Espera a que termine antes de intentarlo de nuevo.',
            'validation_error',
            409,
            'eoir_captcha_busy',
          ),
        );
      }

      pendingRequestRef.current = { resolve, reject };
      setChallengeKey((currentKey) => currentKey + 1);
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      const pendingRequest = pendingRequestRef.current;
      pendingRequestRef.current = null;

      pendingRequest?.reject(
        createCaptchaApiException(
          'La verificacion humana se interrumpio. Intenta de nuevo.',
          'validation_error',
          400,
          'eoir_captcha_unmount',
        ),
      );
    };
  }, []);

  return {
    requestToken,
    modalProps: {
      visible,
      challengeKey,
      onSuccess: handleSuccess,
      onCancel: handleCancel,
      onError: handleError,
    },
  };
}

export default useEoirCaptchaChallenge;