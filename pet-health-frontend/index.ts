import { registerRootComponent } from 'expo';
import App from './App';
import { initI18n } from './src/i18n';
import { debugLog } from './src/utils/debugLog';

debugLog('STARTUP', 'index.registerRootComponent.enter');
void initI18n()
  .then(() => debugLog('STARTUP', 'index.initI18n.ok'))
  .catch((error) =>
    debugLog('STARTUP', 'index.initI18n.fail', {
      message: error instanceof Error ? error.message : String(error),
    }),
  );
registerRootComponent(App);
debugLog('STARTUP', 'index.registerRootComponent.done');
