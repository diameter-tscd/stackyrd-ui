import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8080',
				changeOrigin: true
			},
			'/mcp': {
				target: 'http://localhost:8080',
				changeOrigin: true
			},
			'/health': {
				target: 'http://localhost:8080',
				changeOrigin: true
			},
			'/metrics': {
				target: 'http://localhost:8080',
				changeOrigin: true
			},
			'/swagger': {
				target: 'http://localhost:8080',
				changeOrigin: true
			}
		}
	}
});
