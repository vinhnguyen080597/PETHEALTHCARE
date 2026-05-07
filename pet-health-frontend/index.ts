import * as WebBrowser from 'expo-web-browser';
import { registerRootComponent } from 'expo';
import App from './App';
import { initI18n } from './src/i18n';

WebBrowser.maybeCompleteAuthSession();

void initI18n();
registerRootComponent(App);
