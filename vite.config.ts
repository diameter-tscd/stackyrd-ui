import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
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
