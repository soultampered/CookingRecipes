import { goto } from '$app/navigation';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import type { User } from '$lib/types/user';
import { getCurrentUser } from '$lib/api/auth';
import { setAuthToken, setRefreshToken } from '$lib/api/client';
import { markAuthReady } from './authReady';
import { onForceLogout, onTokensRefreshed } from './authEvents';
import { toast } from './toast.svelte';
import { t } from '../i18n/index.svelte';

const TOKEN_KEY = 'stokpot.token';
const REFRESH_TOKEN_KEY = 'stokpot.refreshToken';

class SessionState {
	token = $state<string | null>(null);
	refreshToken = $state<string | null>(null);
	user = $state<User | null>(null);
	ready = $state(false);

	async restore() {
		const [token, refreshToken] = await Promise.all([
			SecureStorage.getItem(TOKEN_KEY),
			SecureStorage.getItem(REFRESH_TOKEN_KEY)
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
			await Promise.all([SecureStorage.removeItem(TOKEN_KEY), SecureStorage.removeItem(REFRESH_TOKEN_KEY)]);
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
			SecureStorage.setItem(TOKEN_KEY, accessToken),
			SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
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
		await Promise.all([SecureStorage.removeItem(TOKEN_KEY), SecureStorage.removeItem(REFRESH_TOKEN_KEY)]);
	}
}

export const session = new SessionState();

// Runs once per app boot, regardless of which route is entered first (including a hard
// reload on a deep route) — every apiFetch call awaits `authReady`, which this resolves.
export const sessionRestored = session.restore();

onForceLogout(() => {
	// Clear local state and always navigate to /welcome — without this, a session dying
	// while the user is already deep in the app (not on the root route) would just leave
	// them stranded on a page whose data requests now silently fail. This only fires from
	// apiFetch's 401 handling on a live session (expired refresh token, detected token
	// reuse), never during a cold-start restore() failure, so the toast is always relevant.
	session.signOut();
	toast.push(t('session.expired'));
	goto('/welcome');
});

onTokensRefreshed(({ accessToken, refreshToken }) => {
	session.token = accessToken;
	session.refreshToken = refreshToken;
	SecureStorage.setItem(TOKEN_KEY, accessToken);
	SecureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
});
