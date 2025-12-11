import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sia.genesis',
  appName: 'genesis',
  // 🔴 원래: 'dist'
  // 🟢 SvelteKit 빌드 결과 폴더 이름: 'build'
  webDir: 'build'
};

export default config;
