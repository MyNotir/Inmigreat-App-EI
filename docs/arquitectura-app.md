# Arquitectura App Móvil — Inmigreat

Documento de referencia de la app React Native + Expo.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React Native + Expo + TypeScript |
| Auth | Amazon Cognito + expo-auth-session + expo-web-browser |
| Pagos | No integrado actualmente |
| Push | Expo Push API |
| Media | S3 pre-signed URLs + CloudFront |
| Navegación | React Navigation |
| Estado global | `AuthContext` como store único de sesión y usuario |
| Almacenamiento local | Expo SecureStore (sesión) + AsyncStorage (borradores, preferencias locales y cache) |

---

## Autenticación — Cognito

**Métodos:** Email/password · Google · Apple (Sign in with Apple)

**Modelo canónico del workspace:**
- Un solo User Pool por entorno.
- Un solo App Client público compartido entre app móvil y web dentro de cada entorno.
- La app se autentica directamente contra Cognito.
- El backend no implementa login, registro ni refresh propios; solo valida el `Access Token` recibido.

**Cómo inicia sesión el usuario en móvil:**
- Email/password: la app llama directamente a la API pública de Cognito, sin enviar al usuario a una URL externa visible.
- Google/Apple: la app abre Cognito Hosted UI con `expo-auth-session` y `expo-web-browser`, y vuelve por callback o deep link al terminar.
- Configuración mínima en móvil: `EXPO_PUBLIC_COGNITO_HOSTED_UI_URL` y un callback compatible como `inmigreat://` o un callback dedicado si Cognito lo registra explícitamente.
- Dominios esperados por entorno: develop puede usar `https://auth-dev.inmigreat.com` y production `https://auth.inmigreat.com` si CDK registra dominios custom; si no, la app sigue funcionando con el dominio administrado por Cognito.

```
Usuario → Cognito (API directa + Hosted UI)
  → Tokens: Access Token + ID Token + Refresh Token
  → Almacenados en Expo SecureStore
  → Cada request al backend: Authorization: Bearer {AccessToken}
  → Backend valida JWT contra JWKS públicas de Cognito (sin red)
```

**Auto-provisioning:** En el primer request autenticado, el backend crea el usuario en RDS con los claims del token (`cognito_sub`, `email`, `name`, `language`).

**Store de cliente:** La app mantiene una sola fuente de verdad para sesión y datos de usuario en `AuthContext`. Ver [manejo-sesion-usuario.md](./manejo-sesion-usuario.md).

---

## Manejo de Sesión y Datos de Usuario

Resumen operativo:

- `AuthContext` expone `authState` para navegación y `currentUser` para UI.
- `src/services/session.ts` persiste la sesión canónica en `SecureStore`.
- `src/services/auth.ts` orquesta Cognito, backend, refresh y logout.
- AsyncStorage solo conserva borradores de onboarding, preferencias locales como biometría y caches de UI.
- No existe un segundo contexto de usuario ni un store paralelo para nombre, idioma, plan o notificaciones del usuario autenticado.

Para detalles de responsabilidades, flujos y reglas de arquitectura, ver [manejo-sesion-usuario.md](./manejo-sesion-usuario.md).

---

## Integración con el Backend

| | Develop | Production |
|---|---|---|
| API REST | `https://api-dev.inmigreat.com` | `https://api.inmigreat.com` |
| WebSocket | `wss://api-dev.inmigreat.com` | `wss://api.inmigreat.com` |

### WebSocket
- Usado para: feedback en tiempo real cuando el usuario actualiza manualmente un caso
- Conexión: `${EXPO_PUBLIC_BACKEND_WS_URL}${EXPO_PUBLIC_CASES_WS_PATH}?token={AccessToken}`
- **No** es un canal de actualización autónomo — los casos se actualizan una vez/día via job

### SSE — Chat IA
- `POST /chat/conversations` — crea una conversación nueva, opcionalmente vinculada a un caso
- `GET /chat/conversations` y `GET /chat/conversations/:id` — historial y detalle de conversaciones
- `DELETE /chat/conversations/:id` — elimina una conversación del usuario autenticado
- `POST /chat/stream` — respuesta del backend de agentes en chunks vía SSE (`Strands + AgentCore + Bedrock` como stack objetivo; hoy el backend sigue con Bedrock directo)
- `POST /chat` — fallback no streaming si SSE falla o no está disponible
- Eventos SSE: `chunk`, `done`, `error`
- Implementado con `fetch` + `ReadableStream` (no `EventSource` — no disponible en React Native)
- El cliente añade el mensaje del usuario al estado local antes de terminar la respuesta del asistente
- El cliente mantiene una caché local en memoria por `conversationId` para historial reciente

### Grounding y memoria del chat

La app no solo envía `message` y `conversationId`. También puede enviar `appContext` para dar contexto runtime al backend. Hoy incluye:

- `activeTab`
- `currentScreen`
- `sourceScreen`
- `sourceAction`
- `caseId`
- `caseSource`

La app obtiene este contexto desde el estado de navegación activo y lo envía desde `ChatScreen` junto con cada mensaje. El backend usa ese `appContext` como capa de grounding para que la AI entienda mejor:

- en qué pantalla está el usuario
- qué flujo está intentando completar
- si el mensaje viene de un caso USCIS o EOIR
- qué capacidades del producto deberían explicarse o priorizarse

Además del `appContext`, el backend combina otras capas de contexto:

- conocimiento fijo del producto InMigreat
- contexto del caso vinculado, si existe
- `conversationSummary` de la conversación activa
- resúmenes recientes de otras conversaciones del mismo usuario como memoria ligera entre sesiones

Importante: la memoria persistente actual del chat no usa todavía una tabla semántica dedicada. Reutiliza los `conversationSummary` ya guardados por conversación.

### Comportamiento del cliente de chat

Flujo actual en móvil:

1. `ChatScreen` crea la conversación de forma lazy antes del primer mensaje si todavía no existe.
2. Envía el request a `POST /chat/stream` con token Bearer y `appContext`.
3. Va consumiendo chunks desde `ReadableStream` y actualiza `streamingContent` en UI.
4. Si el stream termina bien, guarda el `id` y el `conversationId` final devueltos por el backend.
5. Si el stream falla, cae automáticamente a `POST /chat` como fallback.

Este diseño mantiene baja latencia en la experiencia del usuario sin depender de WebSockets para el chat.

---

## Multimedia — Upload

### Imágenes y Documentos
```
1. App → POST /media/presigned-url
2. App → PUT directamente a S3 (raw-media bucket)
3. App → notifica al API con la URL
```

### Videos
```
1. App → POST /media/presigned-url (tipo: video)
2. App → Upload a S3 (raw-media)
3. Backend procesa con MediaConvert → HLS/MP4
4. Video listo → Push notification: "Tu video está disponible"
5. Video servido desde CloudFront
```

### Avatar
```
POST /users/me/avatar → pre-signed URL → S3 → CloudFront URL en perfil
```

---

## Acceso Pro y entitlements

```
App / Web → Backend → RDS (user_entitlements)
```

**Entitlements:**
- `cases_pro` — Forecast, Intelligence, Accelerators, Pro Alerts
- `group_{id}` — Acceso a grupo de pago específico
- `feature_{key}` — Funcionalidades adicionales (futuro)

No hay SDK de pagos activo en la app. El backend sigue siendo la fuente de verdad para acceso Pro y cualquier entitlement manual o administrativo.

---

## Notificaciones Push — Expo Push

```
1. App → Expo.Notifications.getExpoPushTokenAsync()
2. App → POST /users/me/push-tokens { platform: "ios"|"android", token: "ExpoToken..." }
3. Backend NotificationsService → Expo Push API → APNs / FCM
```

**Categorías:**
- `case_updates`, `community`, `pro_alerts`, `news`

El usuario gestiona preferencias en la pantalla de perfil.

---

## Casos EOIR (CAPTCHA)

```
1. Usuario en detalle de caso EOIR pulsa "Actualizar"
2. App abre WebView con el portal EOIR
3. Usuario resuelve CAPTCHA directamente en la WebView
4. App captura el resultado → POST /cases/:id/eoir-update
5. Backend almacena el estado en RDS
```

---

## Sync Offline

Las acciones realizadas sin conexión se sincronizan al reconectar:

```
Sin conexión → acción encolada en AsyncStorage con idempotencyKey (UUID v4)
Al reconectar → POST /sync/actions [{ type, idempotencyKey, data }]
  → Servidor procesa cada acción independientemente
  → Responde { idempotencyKey, status: "success"|"error"|"skipped" }
  → Acciones exitosas eliminadas de la cola local
```

**Acciones soportadas:** `create_post`, `like_post`, `create_comment`, `join_group`, `send_message`

**Resolución de conflictos:** el servidor decide — verifica el estado actual en DB antes de aplicar.

---

## Variables de Entorno (Expo / eas.json)

| Variable | Develop | Production |
|---|---|---|
| `EXPO_PUBLIC_APP_ENV` | `development` | `production` |
| `EXPO_PUBLIC_BACKEND_URL` | `https://api-dev.inmigreat.com` | `https://api.inmigreat.com` |
| `EXPO_PUBLIC_BACKEND_WS_URL` | `wss://api-dev.inmigreat.com` | `wss://api.inmigreat.com` |
| `EXPO_PUBLIC_GRAPHQL_PATH` | `/graphql` | `/graphql` |
| `EXPO_PUBLIC_CASES_WS_PATH` | `/ws` | `/ws` |
| `EXPO_PUBLIC_HEALTH_PATH` | `/health` | `/health` |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | ID pool develop | ID pool production |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID` | Client ID público compartido develop (app + web) | Client ID público compartido production (app + web) |
| `EXPO_PUBLIC_COGNITO_REGION` | `us-east-1` | `us-east-1` |
| `EXPO_PUBLIC_CDN_URL` | CloudFront develop | CloudFront production |

La app deriva desde esa configuración única:
- REST base URL
- GraphQL HTTP en `${EXPO_PUBLIC_BACKEND_URL}${EXPO_PUBLIC_GRAPHQL_PATH}`
- GraphQL WebSocket en `${EXPO_PUBLIC_BACKEND_WS_URL}${EXPO_PUBLIC_GRAPHQL_PATH}`
- WebSocket de casos en `${EXPO_PUBLIC_BACKEND_WS_URL}${EXPO_PUBLIC_CASES_WS_PATH}`

El valor de `EXPO_PUBLIC_COGNITO_CLIENT_ID` debe representar el mismo App Client público que usa la web en ese entorno.

Para overrides locales, usar `.env.local` o `.env.development.local` y reiniciar Metro.

---

## Relación con Otros Repositorios

| Repo | Relación |
|---|---|
| `Inmigreat-backend` | API REST + WebSocket + SSE que consume la app |
| `Inmigreat-Web` | Web app — mismas funcionalidades, misma API |
| `Inmigreat-App` | Este repo |
