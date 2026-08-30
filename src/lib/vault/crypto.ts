const PBKDF2_ITERATIONS = 250_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function toArrayBufferView(arr: Uint8Array): Uint8Array<ArrayBuffer> {
	return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength) as Uint8Array<ArrayBuffer>;
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		'raw',
		encoder.encode(password),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', salt: toArrayBufferView(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
		keyMaterial,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt']
	);
}

export async function encrypt(data: Uint8Array, password: string): Promise<{ salt: Uint8Array; iv: Uint8Array; ciphertext: ArrayBuffer }> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const key = await deriveKey(password, salt);
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: toArrayBufferView(iv) }, key, toArrayBufferView(data));
	return { salt, iv, ciphertext };
}

export async function decrypt(
	ciphertext: ArrayBuffer,
	password: string,
	salt: Uint8Array,
	iv: Uint8Array
): Promise<Uint8Array> {
	const key = await deriveKey(password, salt);
	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: toArrayBufferView(iv) }, key, ciphertext);
	return new Uint8Array(decrypted);
}
