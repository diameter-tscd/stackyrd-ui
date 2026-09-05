import type { Database } from 'sql.js';
import { encrypt, decrypt } from './crypto';
import { idbGet, idbSet } from './idb';

const VAULT_KEY = 'stackyrd_vault';

export interface Connection {
	id: string;
	name: string;
	apiUrl: string;
	mcpUrl: string;
	token: string;
	createdAt: string;
	lastUsed: string | null;
}

let SQL: any = null;
let db: Database | null = null;
let password: string | null = null;

async function getSql() {
	if (!SQL) {
		const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
			import('sql.js'),
			import('sql.js/dist/sql-wasm.wasm?url')
		] as const);
		SQL = await (initSqlJs as any)({ locateFile: () => wasmUrl });
	}
	return SQL;
}

function normalizeUrl(url: string): string {
	const trimmed = url.trim().replace(/\/+$/, '');
	if (trimmed.includes('localhost:8080') || trimmed.includes('127.0.0.1:8080')) {
		return '/mcp';
	}
	return trimmed;
}

export async function setup(passwordStr: string, conn: Omit<Connection, 'id' | 'createdAt' | 'lastUsed'>): Promise<Connection[]> {
	const SQL = await getSql();
	const _db = new SQL.Database();
	db = _db;
	_db.run(`CREATE TABLE connections (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL UNIQUE,
		api_url TEXT NOT NULL,
		mcp_url TEXT NOT NULL,
		token TEXT NOT NULL,
		created_at TEXT NOT NULL,
		last_used TEXT
	)`);

	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const mcpUrl = normalizeUrl(conn.mcpUrl);

	_db.run('INSERT INTO connections VALUES (?, ?, ?, ?, ?, ?, ?)', [
		id,
		conn.name,
		conn.apiUrl.trim(),
		mcpUrl,
		conn.token,
		createdAt,
		null
	]);

	password = passwordStr;
	await persist();

	return list();
}

export async function unlock(passwordStr: string): Promise<Connection[]> {
	const stored = (await idbGet(VAULT_KEY)) as
		| { salt: Uint8Array; iv: Uint8Array; ciphertext: ArrayBuffer }
		| undefined;

	if (!stored) {
		throw new Error('Vault not found');
	}

	const decrypted = await decrypt(stored.ciphertext, passwordStr, stored.salt, stored.iv);
	const SQL = await getSql();
	db = new SQL.Database(decrypted);
	password = passwordStr;

	return list();
}

export function lock(): void {
	if (db) {
		db.close();
		db = null;
	}
	password = null;
}

export async function persist(): Promise<void> {
	if (!db || !password) return;
	const data = db.export();
	const encrypted = await encrypt(data, password);
	await idbSet(VAULT_KEY, encrypted);
}

export function list(): Connection[] {
	if (!db) return [];
	const result = db.exec('SELECT id, name, api_url, mcp_url, token, created_at, last_used FROM connections ORDER BY created_at');
	if (result.length === 0) return [];
	const rows = result[0].values;
	return rows.map((row) => ({
		id: row[0] as string,
		name: row[1] as string,
		apiUrl: row[2] as string,
		mcpUrl: row[3] as string,
		token: row[4] as string,
		createdAt: row[5] as string,
		lastUsed: (row[6] as string) || null
	}));
}

export function insert(conn: Omit<Connection, 'id' | 'createdAt' | 'lastUsed'>): Connection[] {
	if (!db) return [];
	const id = crypto.randomUUID();
	const createdAt = new Date().toISOString();
	const mcpUrl = normalizeUrl(conn.mcpUrl);
	db.run('INSERT INTO connections VALUES (?, ?, ?, ?, ?, ?, ?)', [
		id,
		conn.name,
		conn.apiUrl.trim(),
		mcpUrl,
		conn.token,
		createdAt,
		null
	]);
	void persist();
	return list();
}

export function update(id: string, data: Partial<Omit<Connection, 'id' | 'createdAt'>>): Connection[] {
	if (!db) return [];
	const existing = list().find((c) => c.id === id);
	if (!existing) return list();

	const name = data.name ?? existing.name;
	const apiUrl = data.apiUrl ?? existing.apiUrl;
	const mcpUrl = normalizeUrl(data.mcpUrl ?? existing.mcpUrl);
	const token = data.token ?? existing.token;

	db.run('UPDATE connections SET name = ?, api_url = ?, mcp_url = ?, token = ? WHERE id = ?', [
		name,
		apiUrl.trim(),
		mcpUrl,
		token,
		id
	]);
	void persist();
	return list();
}

export function remove(id: string): Connection[] {
	if (!db) return [];
	db.run('DELETE FROM connections WHERE id = ?', [id]);
	void persist();
	return list();
}

export function setLastUsed(id: string): Connection[] {
	if (!db) return [];
	const now = new Date().toISOString();
	db.run('UPDATE connections SET last_used = ? WHERE id = ?', [now, id]);
	void persist();
	return list();
}

export async function vaultExists(): Promise<boolean> {
	const stored = await idbGet(VAULT_KEY);
	return !!stored;
}
