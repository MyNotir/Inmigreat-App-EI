# Inmigreat-App — Tareas Pendientes

> Eliminar la tarea de esta lista después de completarla.
> Ordenadas por prioridad: 🔴 Crítico → 🟠 Alto → 🟡 Medio → 🔵 Bajo

---

## 🔴 CRÍTICO

- [ ] **Migrar auth a Cognito + Amplify Auth React Native**
  Reemplazar el sistema JWT propio (`src/services/auth.ts`) por Amplify Auth.
  Métodos: email/password + Google + Apple, todos contra el mismo Cognito User Pool.
  Tokens almacenados en Expo SecureStore. El backend valida con `aws-jwt-verify`.

- [ ] **Reemplazar datos hardcodeados con API real**
  - `SAMPLE_CASES` en `CasesScreen.tsx`
  - `SAMPLE_GROUPS` en `CommunityScreen.tsx` y `GroupDetailScreen.tsx`
  - `getSampleCaseContext()` en `ChatScreen.tsx`
  Conectar con los endpoints reales del backend usando el token de Cognito.

- [ ] **Agregar Error Boundary global**
  No existe ningún `ErrorBoundary`. Crear componente y envolverlo en `App.tsx`.

---

## 🟠 ALTA PRIORIDAD

- [ ] **Completar Social Login — Google y Apple via Cognito**
  Los botones existen en `LoginScreen` pero no llaman a ningún proveedor.
  Integrar `expo-apple-authentication` y Google Sign-In contra Cognito/Amplify.

- [ ] **WebSocket — feedback de actualización manual de casos**
  El cliente WS ya está implementado. Ajustar para que solo se use cuando el usuario
  pulsa "Actualizar" manualmente — no como canal de actualización autónomo.
  Los casos se actualizan automáticamente una vez al día via job del backend.
  Conectar cuando el backend exponga `wss://api-dev.inmigreat.com`.

- [ ] **Casos EOIR — WebView con CAPTCHA**
  En el detalle de un caso EOIR, mostrar botón "Actualizar".
  Al pulsarlo: abrir WebView con el portal EOIR para que el usuario resuelva el CAPTCHA.
  Capturar el resultado y enviarlo a `POST /cases/:id/eoir-update`.

- [ ] **Upload de multimedia a S3**
  Al crear un post con imagen o documento:
  1. `POST /media/presigned-url` → obtener URL firmada
  2. PUT directo a S3
  3. Notificar al API con la URL del archivo
  Para videos: upload multipart + estado `processing` mientras MediaConvert transcodifica.

- [ ] **Agregar estados de loading y error en screens**
  `CasesScreen`, `CommunityScreen`, `GroupDetailScreen`, `ResourcesScreen`:
  skeleton loaders, estados de error con retry, y pull-to-refresh.

---

## 🟡 MEDIO

- [ ] **Sync Offline — cola de acciones con idempotencyKey**
  Encolar en AsyncStorage las acciones realizadas sin conexión.
  Cada acción incluye un `idempotencyKey` (UUID v4) para evitar duplicados.
  Al reconectar: `POST /sync/actions` con el array de acciones.
  Acciones soportadas: `create_post`, `like_post`, `create_comment`, `join_group`, `send_message`.
  El servidor decide el estado final — nunca asumir en el cliente.

- [ ] **Implementar i18n (internacionalización)**
  El idioma se guarda en el perfil pero todos los strings están hardcodeados en español.
  Integrar `i18next` con traducciones para ES, EN y PT.

- [ ] **Upload de avatar**
  En la pantalla de perfil, permitir cambiar foto:
  `POST /users/me/avatar` → pre-signed URL → S3 → mostrar desde CloudFront.

- [ ] **Pantalla de suscripción y paywall**
  Crear `PaywallScreen` informativa para acceso Pro.
  Mostrar paywall cuando el usuario intenta acceder a features Pro sin `cases_pro`.

- [ ] **Eliminación de cuenta**
  En perfil → "Eliminar cuenta" → confirmación → `DELETE /users/me`.
  El backend anonimiza datos en RDS y elimina el usuario de Cognito.
  Limpiar SecureStore y AsyncStorage local al completar.

- [ ] **Agregar retry con exponential backoff en API client**
  Las llamadas fallan inmediatamente. Agregar 3 intentos con backoff en `src/services/api.ts`.
  Amplify Auth gestiona el refresh de tokens automáticamente — eliminar lógica manual de refresh.

- [ ] **Namespacear storage keys por usuario**
  Keys globales en `storage.ts` — en dispositivos compartidos un usuario puede ver datos de otro.
  Agregar `cognito_sub` al namespace de los keys.

- [ ] **Completar deep linking para `CaseDetail`**
  `RootNavigator.tsx` define `cases` pero no `cases/:caseId`.
  Agregar ruta para navegar directamente a un caso (desde push notification).

- [ ] **Implementar cancelación de requests con `AbortController`**
  Requests no se cancelan al navegar. Usar `AbortController` en api.ts y limpiar en `useEffect` cleanup.

---

## 🔵 BAJO

- [ ] **Agregar `accessibilityLabel` y `accessibilityRole`**
  `CaseCard.tsx`, `PostCard.tsx`, `ProTabs.tsx` — agregar labels para lectores de pantalla.

- [ ] **Optimizar re-renders con `React.memo` y `useMemo`**
  Items de listas (`CaseCard`, `PostCard`) no están memoizados. Aplicar en componentes de lista.
