import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { backendConfig } from '../config/env';
import { ApiException } from './api';

WebBrowser.maybeCompleteAuthSession();

const COGNITO_SOCIAL_SCOPES = ['openid', 'email', 'profile'];

const COGNITO_SOCIAL_PROVIDER_NAMES = {
  google: 'Google',
  apple: 'SignInWithApple',
} as const;

interface CognitoErrorBody {
  __type?: string;
  message?: string;
  Message?: string;
}

export interface CognitoCodeDeliveryDetails {
  destination?: string;
  deliveryMedium?: string;
  attributeName?: string;
}

export interface CognitoAuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
  tokenType?: string;
}

export type CognitoSocialProvider = keyof typeof COGNITO_SOCIAL_PROVIDER_NAMES;

export interface CognitoHostedUiProfile {
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export interface CognitoHostedUiResult extends CognitoAuthTokens {
  profile?: CognitoHostedUiProfile;
}

export interface CognitoSignUpResult {
  userConfirmed: boolean;
  codeDeliveryDetails?: CognitoCodeDeliveryDetails;
}

interface CognitoAuthenticationResult {
  AccessToken?: string;
  RefreshToken?: string;
  IdToken?: string;
  ExpiresIn?: number;
  TokenType?: string;
}

function createRequestId(): string {
  return `cognito_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getMessage(body: CognitoErrorBody): string | undefined {
  return body.message || body.Message;
}

function getErrorCode(body: CognitoErrorBody): string {
  const raw = body.__type || '';
  const normalized = raw.includes('#') ? raw.split('#').pop() : raw;
  return normalized || 'UnknownException';
}

function getConfig() {
  const { region, userPoolId, clientId } = backendConfig.cognito;

  if (!region || !userPoolId || !clientId) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Falta la configuración de Cognito en esta build de la app.',
      requestId: createRequestId(),
    });
  }

  return {
    region,
    userPoolId,
    clientId,
    endpoint: `https://cognito-idp.${region}.amazonaws.com/`,
  };
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function buildRedirectUri(): string {
  const explicitRedirectUri = backendConfig.cognito.redirectUri?.trim();
  if (explicitRedirectUri) {
    return explicitRedirectUri;
  }

  const configuredScheme = Constants.expoConfig?.scheme;
  const scheme = typeof configuredScheme === 'string' && configuredScheme.trim()
    ? configuredScheme.trim()
    : 'inmigreat';

  return AuthSession.makeRedirectUri({
    scheme,
    native: `${scheme}://`,
  });
}

function getHostedUiConfig() {
  const { clientId, hostedUiUrl } = backendConfig.cognito;

  if (!clientId || !hostedUiUrl?.trim()) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Falta la configuración de Cognito Hosted UI en esta build de la app.',
      requestId: createRequestId(),
    });
  }

  return {
    clientId,
    hostedUiUrl: normalizeBaseUrl(hostedUiUrl),
    redirectUri: buildRedirectUri(),
  };
}

function createHostedUiDiscovery(hostedUiUrl: string) {
  return {
    authorizationEndpoint: `${hostedUiUrl}/oauth2/authorize`,
    tokenEndpoint: `${hostedUiUrl}/oauth2/token`,
    revocationEndpoint: `${hostedUiUrl}/oauth2/revoke`,
    userInfoEndpoint: `${hostedUiUrl}/oauth2/userInfo`,
    endSessionEndpoint: `${hostedUiUrl}/logout`,
  };
}

function mapAuthSessionTokens(result: {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType?: string;
}): CognitoAuthTokens {
  if (!result.accessToken || !result.expiresIn) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Cognito Hosted UI no devolvió una sesión válida.',
      requestId: createRequestId(),
    });
  }

  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    idToken: result.idToken,
    expiresIn: result.expiresIn,
    tokenType: result.tokenType,
  };
}

function ensureSupportedSocialRuntime(): void {
  const appOwnership = (Constants as any).appOwnership;
  const executionEnvironment = (Constants as any).executionEnvironment;

  if (appOwnership === 'expo' || executionEnvironment === 'storeClient') {
    throw new ApiException({
      type: 'server_error',
      code: 400,
      message: 'Google y Apple requieren un development build o una app instalada. Expo Go no soporta este flujo OAuth.',
      requestId: createRequestId(),
    });
  }
}

function createSocialProviderLabel(provider: CognitoSocialProvider): string {
  return provider === 'google' ? 'Google' : 'Apple';
}

function createSocialLoginResultException(
  result: { type: string; params?: Record<string, string>; error?: { description?: string; code?: string } },
  provider: CognitoSocialProvider,
): ApiException {
  const requestId = createRequestId();
  const providerLabel = createSocialProviderLabel(provider);
  const message = result.params?.error_description
    || result.params?.error
    || result.error?.description
    || result.error?.code;

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return new ApiException({
      type: 'auth_error',
      code: 499,
      message: `Cancelaste el acceso con ${providerLabel}.`,
      requestId,
    });
  }

  return new ApiException({
    type: 'server_error',
    code: 500,
    message: message || `No fue posible completar el acceso con ${providerLabel}.`,
    requestId,
  });
}

function createSocialLoginUnexpectedException(
  provider: CognitoSocialProvider,
  error: unknown,
): ApiException {
  const message = error instanceof Error ? error.message.trim() : '';
  const providerLabel = createSocialProviderLabel(provider);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('network')) {
    return new ApiException({
      type: 'network_error',
      code: 0,
      message: `No pudimos completar el acceso con ${providerLabel} por un problema de red.`,
      requestId: createRequestId(),
    });
  }

  return new ApiException({
    type: 'server_error',
    code: 500,
    message: message || `No fue posible abrir el acceso con ${providerLabel}.`,
    requestId: createRequestId(),
  });
}

function createException(body: CognitoErrorBody, requestId: string): ApiException {
  const code = getErrorCode(body);
  const message = getMessage(body);

  switch (code) {
    case 'UserNotConfirmedException':
      return new ApiException({
        type: 'auth_error',
        code: 401,
        message: 'Debes confirmar tu correo electrónico antes de iniciar sesión.',
        requestId,
      });
    case 'NotAuthorizedException':
      return new ApiException({
        type: 'auth_error',
        code: 401,
        message: message || 'Credenciales inválidas. Verifica tu correo y contraseña.',
        requestId,
      });
    case 'UsernameExistsException':
      return new ApiException({
        type: 'validation_error',
        code: 409,
        message: 'Ya existe una cuenta con ese correo electrónico.',
        details: {
          email: ['Ya existe una cuenta con ese correo electrónico.'],
        },
        requestId,
      });
    case 'InvalidPasswordException':
      return new ApiException({
        type: 'validation_error',
        code: 400,
        message: message || 'La contraseña no cumple los requisitos de seguridad.',
        details: {
          password: [message || 'La contraseña no cumple los requisitos de seguridad.'],
        },
        requestId,
      });
    case 'CodeMismatchException':
      return new ApiException({
        type: 'validation_error',
        code: 400,
        message: 'El código ingresado no es válido.',
        details: {
          code: ['El código ingresado no es válido.'],
        },
        requestId,
      });
    case 'ExpiredCodeException':
      return new ApiException({
        type: 'validation_error',
        code: 400,
        message: 'El código expiró. Solicita uno nuevo.',
        details: {
          code: ['El código expiró. Solicita uno nuevo.'],
        },
        requestId,
      });
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return new ApiException({
        type: 'server_error',
        code: 429,
        message: 'Demasiados intentos. Espera un momento e intenta nuevamente.',
        requestId,
      });
    case 'UserNotFoundException':
      return new ApiException({
        type: 'auth_error',
        code: 404,
        message: 'No encontramos una cuenta con ese correo electrónico.',
        requestId,
      });
    default:
      return new ApiException({
        type: 'server_error',
        code: 500,
        message: message || 'No fue posible completar la operación de autenticación.',
        requestId,
      });
  }
}

function mapTokens(result: CognitoAuthenticationResult | undefined): CognitoAuthTokens {
  if (!result?.AccessToken || !result.ExpiresIn) {
    throw new ApiException({
      type: 'server_error',
      code: 500,
      message: 'Cognito no devolvió una sesión válida.',
      requestId: createRequestId(),
    });
  }

  return {
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    idToken: result.IdToken,
    expiresIn: result.ExpiresIn,
    tokenType: result.TokenType,
  };
}

async function cognitoRequest<T>(target: string, payload: Record<string, unknown>): Promise<T> {
  const { endpoint } = getConfig();
  const requestId = createRequestId();

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiException({
      type: 'network_error',
      code: 0,
      message: 'Sin conexión a internet. Por favor verifica tu conexión.',
      requestId,
    });
  }

  const body = (await response.json().catch(() => ({}))) as CognitoErrorBody & T;

  if (!response.ok) {
    throw createException(body, requestId);
  }

  return body as T;
}

export async function signInWithPassword(email: string, password: string): Promise<CognitoAuthTokens> {
  const { clientId } = getConfig();
  const response = await cognitoRequest<{ AuthenticationResult?: CognitoAuthenticationResult }>('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  return mapTokens(response.AuthenticationResult);
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name?: string,
): Promise<CognitoSignUpResult> {
  const { clientId } = getConfig();
  const attributes = [{ Name: 'email', Value: email }];

  if (name?.trim()) {
    attributes.push({ Name: 'name', Value: name.trim() });
  }

  const response = await cognitoRequest<{
    UserConfirmed: boolean;
    CodeDeliveryDetails?: {
      Destination?: string;
      DeliveryMedium?: string;
      AttributeName?: string;
    };
  }>('SignUp', {
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: attributes,
  });

  return {
    userConfirmed: response.UserConfirmed,
    codeDeliveryDetails: response.CodeDeliveryDetails
      ? {
          destination: response.CodeDeliveryDetails.Destination,
          deliveryMedium: response.CodeDeliveryDetails.DeliveryMedium,
          attributeName: response.CodeDeliveryDetails.AttributeName,
        }
      : undefined,
  };
}

export async function confirmSignUpCode(email: string, code: string): Promise<void> {
  const { clientId } = getConfig();
  await cognitoRequest('ConfirmSignUp', {
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
  });
}

export async function resendSignUpCode(email: string): Promise<CognitoCodeDeliveryDetails | undefined> {
  const { clientId } = getConfig();
  const response = await cognitoRequest<{
    CodeDeliveryDetails?: {
      Destination?: string;
      DeliveryMedium?: string;
      AttributeName?: string;
    };
  }>('ResendConfirmationCode', {
    ClientId: clientId,
    Username: email,
  });

  if (!response.CodeDeliveryDetails) {
    return undefined;
  }

  return {
    destination: response.CodeDeliveryDetails.Destination,
    deliveryMedium: response.CodeDeliveryDetails.DeliveryMedium,
    attributeName: response.CodeDeliveryDetails.AttributeName,
  };
}

export async function startForgotPassword(email: string): Promise<void> {
  const { clientId } = getConfig();
  await cognitoRequest('ForgotPassword', {
    ClientId: clientId,
    Username: email,
  });
}

export async function confirmForgotPasswordChange(
  email: string,
  code: string,
  password: string,
): Promise<void> {
  const { clientId } = getConfig();
  await cognitoRequest('ConfirmForgotPassword', {
    ClientId: clientId,
    Username: email,
    ConfirmationCode: code,
    Password: password,
  });
}

export async function refreshCognitoSession(refreshToken: string): Promise<CognitoAuthTokens> {
  const { clientId } = getConfig();
  const response = await cognitoRequest<{ AuthenticationResult?: CognitoAuthenticationResult }>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: clientId,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });

  return mapTokens(response.AuthenticationResult);
}

export async function signInWithHostedUi(
  provider: CognitoSocialProvider,
): Promise<CognitoHostedUiResult> {
  ensureSupportedSocialRuntime();

  const { clientId, hostedUiUrl, redirectUri } = getHostedUiConfig();
  const discovery = createHostedUiDiscovery(hostedUiUrl);

  try {
    const request = await AuthSession.loadAsync(
      {
        clientId,
        redirectUri,
        scopes: [...COGNITO_SOCIAL_SCOPES],
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: {
          identity_provider: COGNITO_SOCIAL_PROVIDER_NAMES[provider],
          ...(provider === 'google' ? { prompt: 'select_account' } : {}),
        },
      },
      discovery,
    );

    const result = await request.promptAsync(discovery, {
      showInRecents: true,
    });

    if (result.type !== 'success' || !result.params.code) {
      throw createSocialLoginResultException(result as any, provider);
    }

    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri,
        extraParams: request.codeVerifier
          ? { code_verifier: request.codeVerifier }
          : undefined,
      },
      discovery,
    );

    const profile = tokenResponse.accessToken
      ? await AuthSession.fetchUserInfoAsync(
          { accessToken: tokenResponse.accessToken },
          discovery,
        ).catch(() => null)
      : null;

    return {
      ...mapAuthSessionTokens(tokenResponse),
      ...(profile ? { profile: profile as CognitoHostedUiProfile } : {}),
    };
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }

    throw createSocialLoginUnexpectedException(provider, error);
  }
}

export async function globalSignOut(accessToken: string): Promise<void> {
  await cognitoRequest('GlobalSignOut', {
    AccessToken: accessToken,
  });
}