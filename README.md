# Inmigreat-App

Aplicación móvil de Inmigreat construida con Expo y TypeScript.

## Auth actual

La autenticación canónica del workspace usa Amazon Cognito directamente desde cliente.

- Un User Pool por entorno.
- Un App Client público compartido entre app móvil y web en cada entorno.
- El backend solo valida `Access Token`; no expone login, registro ni refresh propios.

## Variables de entorno

La app usa variables `EXPO_PUBLIC_*`.

Local:

1. Copia `/.env.example` a `/.env`.
2. Completa los valores de develop en ese archivo local.
3. Expo y el dev client leerán esas variables directamente desde `/.env`.

Builds remotos con Expo / EAS:

1. Los perfiles `development`, `developmentDevices` y `preview` usan el environment remoto `development`.
2. El perfil `production` usa el environment remoto `production`.
3. `eas.json` solo selecciona el environment y flags no sensibles; no debe contener URLs, IDs de Cognito ni secretos embebidos.

Variables mínimas requeridas:

- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_BACKEND_WS_URL`
- `EXPO_PUBLIC_GRAPHQL_PATH`
- `EXPO_PUBLIC_CASES_WS_PATH`
- `EXPO_PUBLIC_HEALTH_PATH`
- `EXPO_PUBLIC_COGNITO_REGION`
- `EXPO_PUBLIC_COGNITO_USER_POOL_ID`
- `EXPO_PUBLIC_COGNITO_CLIENT_ID`

## Documentación

- `docs/arquitectura-app.md`

## Desarrollo Local Con Dev Client

Flujo recomendado local:

1. Compilar ambos development builds con un solo comando cuando cambie algo nativo:
	- `npm run dev-client:build:all`
2. Levantar Metro y abrir iOS + Android con un solo comando:
	- `npm run dev-client:up`

También existe:

- `npm run start:dev-client` para levantar solo Metro.
- `npm run dev-client:open:all` para abrir iOS y Android si Metro ya está arriba.
- `npm run ios:build:local` y `npm run android:build:local` para compilar por plataforma.
- `npm run ios:dev-client` y `npm run android:dev-client` para abrir por plataforma.

Notas:

- Metro de dev client usa `8081` por defecto para ambas plataformas.
- `npm run dev-client:up` reutiliza Metro si ya existe; si no, lo arranca en segundo plano y deja el log en `.expo/dev-client-metro.log`.
- `npm run dev-client:up` también arranca automáticamente el primer simulador iOS y el primer AVD Android disponibles si no están abiertos.
- Android local requiere `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`.
- iOS local se construye para simulador con `xcodebuild` y se instala con `simctl` para preservar entitlements de `SecureStore`.
- Si necesitas otro host o puerto, puedes exportar `DEV_CLIENT_HOST` y `DEV_CLIENT_PORT` antes de abrir los clientes.
