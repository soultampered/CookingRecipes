import { goto } from '$app/navigation';
import { Preferences } from '@capacitor/preferences';
import type { User } from '$lib/types/user';
import { getCurrentUser } from '$lib/api/auth';
import { setAuthToken, setRefreshToken } from '$lib/api/client';
import { markAuthReady } from './authReady';
import { onForceLogout, onTokensRefreshed } from './authEvents';

const TOKEN_KEY = 'larder.token';
const REFRESH_TOKEN_KEY = 'larder.refreshToken';

class SessionState {
	token = $state<string | null>(null);
	refreshToken = $state<string | null>(null);
	user = $state<User | null>(null);
	ready = $state(false);

	async restore() {
		const [{ value: token }, { value: refreshToken }] = await Promise.all([
			Preferences.get({ key: TOKEN_KEY }),
			Preferences.get({ key: REFRESH_TOKEN_KEY })
		]);
		if (!token || !refreshToken) {
			this.ready = true;
			markAuthReady();
			return;
		}
		// Attach both tokens and unblock any waiting apiFetch calls before validating them —
		// validation itself goes through apiFetch, which awaits this same readiness signal.
		setAuthToken(token);
		setRefreshToken(refreshToken);
		markAuthReady();
		try {
			this.user = await getCurrentUser();
			this.token = token;
			this.refreshToken = refreshToken;
		} catch {
			setAuthToken(null);
			setRefreshToken(null);
			await Promise.all([
				Preferences.remove({ key: TOKEN_KEY }),
				Preferences.remove({ key: REFRESH_TOKEN_KEY })
			]);
		}
		this.ready = true;
	}

	async signIn({
		accessToken,
		refreshToken,
		user
	}: {
		accessToken: string;
		refreshToken: string;
		user: User;
	}) {
		this.token = accessToken;
		this.refreshToken = refreshToken;
		this.user = user;
		setAuthToken(accessToken);
		setRefreshToken(refreshToken);
		await Promise.all([
			Preferences.set({ key: TOKEN_KEY, value: accessToken }),
			Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken })
		]);
	}

	// Updates only the reactive user, no token/Preferences writes — for cases like
	// verify-email where the tokens don't change, only the user record does.
	setUser(user: User) {
		this.user = user;
	}

	async signOut() {
		this.token = null;
		this.refreshToken = null;
		this.user = null;
		setAuthToken(null);
		setRefreshToken(null);
		await Promise.all([
			Preferences.remove({ key: TOKEN_KEY }),
			Preferences.remove({ key: REFRESH_TOKEN_KEY })
		]);
	}
}

export const session = new SessionState();

// Runs once per app boot, regardless of which route is entered first (including a hard
// reload on a deep route) — every apiFetch call awaits `authReady`, which this resolves.
export const sessionRestored = session.restore();

onForceLogout(() => {
	// Clear local state and always navigate to /welcome — without this, a session dying
	// while the user is already deep in the app (not on the root route) would just leave
	// them stranded on a page whose data requests now silently fail.
	session.signOut();
	goto('/welcome');
});

onTokensRefreshed(({ accessToken, refreshToken }) => {
	session.token = accessToken;
	session.refreshToken = refreshToken;
	Preferences.set({ key: TOKEN_KEY, value: accessToken });
	Preferences.set({ key: REFRESH_TOKEN_KEY, value: refreshToken });
});
