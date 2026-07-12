import { Preferences } from '@capacitor/preferences';
import type { User } from '$lib/types/user';
import { getCurrentUser } from '$lib/api/auth';
import { setAuthToken } from '$lib/api/client';
import { markAuthReady } from './authReady';

const STORAGE_KEY = 'larder.token';

class SessionState {
	token = $state<string | null>(null);
	user = $state<User | null>(null);
	ready = $state(false);

	async restore() {
		const { value } = await Preferences.get({ key: STORAGE_KEY });
		if (!value) {
			this.ready = true;
			markAuthReady();
			return;
		}
		// Attach the token and unblock any waiting apiFetch calls before validating it —
		// validation itself goes through apiFetch, which awaits this same readiness signal.
		setAuthToken(value);
		markAuthReady();
		try {
			this.user = await getCurrentUser();
			this.token = value;
		} catch {
			setAuthToken(null);
			await Preferences.remove({ key: STORAGE_KEY });
		}
		this.ready = true;
	}

	async signIn({ token, user }: { token: string; user: User }) {
		this.token = token;
		this.user = user;
		setAuthToken(token);
		await Preferences.set({ key: STORAGE_KEY, value: token });
	}

	async signOut() {
		this.token = null;
		this.user = null;
		setAuthToken(null);
		await Preferences.remove({ key: STORAGE_KEY });
	}
}

export const session = new SessionState();

// Runs once per app boot, regardless of which route is entered first (including a hard
// reload on a deep route) — every apiFetch call awaits `authReady`, which this resolves.
export const sessionRestored = session.restore();
