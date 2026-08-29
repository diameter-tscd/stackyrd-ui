/// <reference types="@sveltejs/kit" />

declare module '$env/static/public' {
	export const PUBLIC_API_URL: string;
	export const PUBLIC_MCP_URL: string;
	export const PUBLIC_API_TOKEN: string;
}
