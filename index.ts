import { registerRootComponent } from 'expo';
import { captureException, wrapRootComponent } from './src/services/error-monitoring';

declare const require: <TModule = unknown>(moduleName: string) => TModule;

let App: typeof import('./App').default;

try {
	App = require<typeof import('./App')>('./App').default;
} catch (error) {
	captureException(error, {
		tags: {
			scope: 'app.import',
		},
	});
	throw error;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(wrapRootComponent(App));
