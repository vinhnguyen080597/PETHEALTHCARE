import { registerRootComponent } from 'expo';
import App from './App';
import { initI18n } from './src/i18n';

void initI18n();
registerRootComponent(App);
