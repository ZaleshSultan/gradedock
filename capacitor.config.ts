import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = { appId: 'com.zaleshsultan.gradedock', appName: 'GradeDock', webDir: 'dist', server:{errorPath:'unsupported-webview.html'}, android: { backgroundColor: '#f7f6f1', minWebViewVersion:107 } };
export default config;
