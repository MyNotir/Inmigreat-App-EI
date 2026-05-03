const appJson = require('./app.json');

const PUBLIC_RUNTIME_ENV_KEYS = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_BACKEND_URL',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_BACKEND_WS_URL',
  'EXPO_PUBLIC_WS_URL',
  'EXPO_PUBLIC_GRAPHQL_PATH',
  'EXPO_PUBLIC_CASES_WS_PATH',
  'EXPO_PUBLIC_HEALTH_PATH',
  'EXPO_PUBLIC_COGNITO_REGION',
  'EXPO_PUBLIC_COGNITO_USER_POOL_ID',
  'EXPO_PUBLIC_COGNITO_CLIENT_ID',
  'EXPO_PUBLIC_COGNITO_HOSTED_UI_URL',
  'EXPO_PUBLIC_COGNITO_REDIRECT_URI',
  'EXPO_PUBLIC_SENTRY_DSN',
];

function hasValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildPublicRuntimeEnv() {
  return Object.fromEntries(
    PUBLIC_RUNTIME_ENV_KEYS.flatMap((key) => {
      const value = process.env[key]?.trim();
      return value ? [[key, value]] : [];
    }),
  );
}

function buildSentryPlugin() {
  const organization = process.env.SENTRY_ORG?.trim();
  const project = process.env.SENTRY_PROJECT?.trim();
  const url = process.env.SENTRY_URL?.trim() || 'https://sentry.io/';

  if (!hasValue(organization) || !hasValue(project)) {
    return '@sentry/react-native';
  }

  return [
    '@sentry/react-native',
    {
      url,
      organization,
      project,
    },
  ];
}

module.exports = () => {
  const baseConfig = appJson.expo;
  const plugins = (baseConfig.plugins || []).filter((plugin) => {
    if (plugin === '@sentry/react-native') {
      return false;
    }

    return !(Array.isArray(plugin) && plugin[0] === '@sentry/react-native');
  });

  return {
    ...baseConfig,
    extra: {
      ...(baseConfig.extra || {}),
      publicRuntimeEnv: {
        ...((baseConfig.extra && baseConfig.extra.publicRuntimeEnv) || {}),
        ...buildPublicRuntimeEnv(),
      },
    },
    plugins: [
      ...plugins,
      buildSentryPlugin(),
    ],
  };
};