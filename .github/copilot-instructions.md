# Inmigreat App Copilot Instructions

This workspace is an Expo SDK 55 app. For Expo-specific work, prefer official Expo patterns over generic React Native advice.

Use the local Expo skills in `.github/skills/` whenever the task matches:

- `building-native-ui` for screens, navigation, animations, visual polish, and Expo Router-style UI patterns.
- `native-data-fetching` for API requests, caching, offline support, and data loading.
- `expo-dev-client` for development builds, simulator/device builds, and TestFlight dev client distribution.
- `expo-deployment` for EAS Build, Submit, hosting, previews, and store release flows.
- `expo-cicd-workflows` for `.eas/workflows/` YAML files and CI/CD automation.
- `expo-api-routes` for Expo Router API routes and EAS Hosting server features.
- `expo-tailwind-setup` for Tailwind CSS v4, `react-native-css`, and NativeWind v5.
- `use-dom` for DOM components and web-code reuse inside native apps.
- `upgrading-expo` for SDK upgrades, dependency cleanup, and migration work.
- `expo-ui-jetpack-compose` for Android-native UI with `@expo/ui`.
- `expo-ui-swift-ui` for iOS-native UI with `@expo/ui`.

Operational preferences:

- Prefer `npx expo install` over `npm install` for Expo libraries.
- Prefer Expo documentation and Expo MCP-backed answers when the task is Expo-specific.
- Try Expo Go first unless the task requires custom native code, a development build, or unsupported native libraries.
- For local MCP capabilities, use the package scripts that start Expo with `EXPO_UNSTABLE_MCP_SERVER=1`.
- Keep guidance aligned with Expo SDK 55 unless the project is explicitly being upgraded.
