import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version)
	},
	build: {
		target: 'es2022',
		chunkSizeWarningLimit: 300,
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					if (id.includes('node_modules')) {
						if (id.includes('sql.js')) return 'sql';
						if (id.includes('svelteplot')) return 'plot';
						if (id.includes('gsap') || id.includes('motion') || id.includes('framer-motion')) return 'motion';
						if (id.includes('bits-ui')) return 'bits-ui';
						if (id.includes('lucide-svelte')) return 'lucide';
						if (id.includes('svelte')) return 'svelte-vendor';
						return 'vendor';
					}
				}
			}
		}
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
