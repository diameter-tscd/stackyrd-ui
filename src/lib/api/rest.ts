import { PUBLIC_API_URL } from '$env/static/public';
import { browser } from '$app/environment';

export class ApiError extends Error {
	status: number;
	data: unknown;

	constructor(message: string, status: number, data?: unknown) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.data = data;
	}
}

interface RequestOptions {
	method?: string;
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
}

export async function apiFetch<T>(
	path: string,
	token: string | null,
	options: RequestOptions = {}
): Promise<T> {
	const { method = 'GET', body, headers = {}, signal } = options;

	const url = path.startsWith('http')
		? path
		: browser
			? path
			: `${PUBLIC_API_URL}${path}`;

	const reqHeaders: Record<string, string> = {
		'Content-Type': 'application/json',
		...headers
	};

	if (token) {
		reqHeaders['Authorization'] = `Bearer ${token}`;
	}

	const response = await fetch(url, {
		method,
		headers: reqHeaders,
		body: body ? JSON.stringify(body) : undefined,
		signal
	});

	const text = await response.text();
	let data: unknown;

	try {
		data = text ? JSON.parse(text) : null;
	} catch {
		data = text;
	}

	if (!response.ok) {
		const message =
			(data as { message?: string; error?: string })?.message ||
			(data as { error?: string })?.error ||
			response.statusText;
		throw new ApiError(message, response.status, data);
	}

	return data as T;
}
