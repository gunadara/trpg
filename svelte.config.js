import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // 🔽 여기부터가 핵심
    adapter: adapter({
      // SvelteKit이 결과물을 내보낼 폴더
      pages: 'build',
      assets: 'build',
      // Capacitor + SPA용: 어떤 경로로 들어와도 index.html 서빙
      fallback: 'index.html',
      precompress: false,
      strict: true
    })
  }
};

export default config;
