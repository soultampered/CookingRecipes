import { Preferences } from '@capacitor/preferences';
import type { User } from '$lib/types/user';
import { getUser } from '$lib/api/users';

const STORAGE_KEY = 'larder.userId';

class SessionState {
	userId = $state<string | null>(null);
	user = $state<User | null>(null);
	ready = $state(false);

	async restore() {
		const { value } = await Preferences.get({ key: STORAGE_KEY });
		if (!value) {
			this.ready = true;
			return;
		}
		try {
			const user = await getUser(value);
			this.user = user;
			this.userId = value;
		} catch {
			await Preferences.remove({ key: STORAGE_KEY });
		}
		this.ready = true;
	}

	async signIn(user: User) {
		this.user = user;
		this.userId = user._id ?? null;
		if (user._id) await Preferences.set({ key: STORAGE_KEY, value: user._id });
	}

	async signOut() {
		this.user = null;
		this.userId = null;
		await Preferences.remove({ key: STORAGE_KEY });
	}
}

export const session = new SessionState();
