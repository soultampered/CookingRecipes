import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

// Web: tokens live in memory only (localStorage is script-readable). Reload = sign in again.
const memory = new Map<string, string>();
const native = Capacitor.isNativePlatform();

export const tokenStore = {
	async get(key: string): Promise<string | null> {
		return native ? ((await SecureStorage.getItem(key)) as string | null) : (memory.get(key) ?? null);
	},
	async set(key: string, value: string): Promise<void> {
		if (native) await SecureStorage.setItem(key, value);
		else memory.set(key, value);
	},
	async remove(key: string): Promise<void> {
		if (native) await SecureStorage.removeItem(key);
		else memory.delete(key);
	}
};

// Clears tokens an older web build left in localStorage.
if (!native) {
	for (const key of ['stokpot.token', 'stokpot.refreshToken']) SecureStorage.removeItem(key).catch(() => {});
}
