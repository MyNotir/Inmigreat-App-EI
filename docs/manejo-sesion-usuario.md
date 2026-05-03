# Manejo de Sesión y Datos de Usuario

Documento de referencia para el flujo de sesión, persistencia y estado de usuario en la app móvil.

---

## Fuente de verdad

La única fuente de verdad en runtime para sesión y datos visibles del usuario es `AuthContext`.

- `authState` expone el estado de autenticación consumido por navegación.
- `currentUser` contiene el perfil autenticado normalizado que usa la UI.
- `language`, `userName`, `notificationSettings` y `subscriptionStatus` se derivan del mismo store.
- Las pantallas deben consumir `useAuth()` directamente para cualquier dato o acción de sesión/usuario.

Regla de arquitectura:

```text
UI -> useAuth() -> AuthContext -> authService/session/storage
```

No debe existir un segundo contexto de usuario ni otro store paralelo para nombre, idioma, plan o notificaciones del usuario autenticado.

---

## Responsabilidades por capa

### `src/context/AuthContext.tsx`

Responsable de:

- Bootstrapping de la sesión al iniciar la app.
- Exponer `authState` para navegación.
- Mantener `currentUser` en memoria.
- Exponer acciones de UI: login, logout, updateProfile, updateNotificationPreferences, etc.
- Resolver el estado derivado que consumen las pantallas.

No debe:

- Duplicar el usuario en otro contexto.
- Persistir preferencias visibles del usuario autenticado en claves separadas innecesarias.

### `src/services/auth.ts`

Responsable de:

- Hablar con Cognito y con el backend GraphQL.
- Establecer, refrescar y cerrar la sesión.
- Persistir la sesión canónica.
- Notificar cambios de auth a `AuthContext`.

No debe:

- Ser usado como store de UI.
- Mantener una segunda fuente de verdad visible para pantallas.

### `src/services/session.ts`

Responsable de persistir la sesión canónica en `SecureStore`.

`SessionRecord` incluye:

- `user`
- `accessToken`
- `refreshToken`
- `expiresAt`

Esa sesión es la base persistida para restaurar auth al abrir la app.

### `src/services/storage.ts`

Usado para persistencia no sensible o de apoyo:

- `LANGUAGE`: idioma borrador o preferencia local antes de autenticación.
- `USER_NAME`: nombre borrador usado en onboarding antes de tener usuario autenticado.
- `BIOMETRIC_ENABLED`: preferencia local de biometría.
- `CASES_CACHE`, `NAVIGATION_STATE`, otros caches de UI.

La clave `NOTIFICATION_SETTINGS` se conserva solo como limpieza de legado. Ya no es fuente activa de estado.

---

## Flujos principales

### Inicio de app

1. `AuthProvider` ejecuta `checkAuth()`.
2. Se cargan borradores locales (`LANGUAGE`, `USER_NAME`) para onboarding si existen.
3. Se intenta restaurar la sesión desde `session.ts`.
4. Si la sesión sigue válida, se consulta o sincroniza el usuario con backend.
5. `AuthContext` publica `authState.isAuthenticated = true` y `currentUser`.

### Login o confirmación de registro

1. La pantalla llama una acción de `useAuth()`.
2. `authService` obtiene tokens de Cognito.
3. Se resuelve o provisiona el usuario backend.
4. Se persiste `SessionRecord`.
5. `AuthContext` hace commit del `currentUser` y del token activo.

### Actualización de perfil o notificaciones

1. La UI llama `updateProfile()` o `updateNotificationPreferences()`.
2. `authService` actualiza backend.
3. Se actualiza la sesión persistida.
4. `AuthContext` refresca `currentUser`.
5. La UI se rerenderiza desde la misma fuente de verdad.

### Logout o expiración inválida

1. Se limpian tokens y sesión.
2. Se limpian datos locales de onboarding y legado que ya no apliquen.
3. `authState` vuelve a no autenticado.
4. La navegación regresa al flujo de onboarding.

---

## Reglas para cambios futuros

- Leer y escribir estado de usuario desde `useAuth()`.
- No volver a crear `UserContext`, stores paralelos o copias locales persistentes del perfil autenticado.
- Si una pantalla necesita solo `isPro`, `language` o `userName`, igual debe derivarlos de `useAuth()`.
- Si se agregan nuevos campos del usuario autenticado, deben vivir en `User` y sincronizarse vía `authService` + `AuthContext`.
- AsyncStorage solo debe guardar borradores, preferencias locales no sensibles y caches de UI.
- SecureStore debe seguir reservado para sesión, tokens y secretos relacionados.

---

## Checklist de revisión

Antes de aprobar cambios sobre auth/usuario, validar:

- ¿El dato nuevo vive en `AuthContext` y no en otro store?
- ¿La UI consume `useAuth()`?
- ¿La sesión persistida sigue siendo la única base restaurable?
- ¿No se reintrodujo una clave duplicada en AsyncStorage para datos ya contenidos en `currentUser`?
- ¿Logout y sesión expirada limpian el estado correctamente?