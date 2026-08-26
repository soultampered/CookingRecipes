import { Preferences } from '@capacitor/preferences';

const ONBOARDING_SEEN_KEY = 'stokpot.onboardingSeen';

class OnboardingState {
	seen = $state(false);
	restored = $state(false);

	async restore() {
		const { value } = await Preferences.get({ key: ONBOARDING_SEEN_KEY });
		this.seen = value === 'true';
		this.restored = true;
	}

	async dismiss() {
		this.seen = true;
		await Preferences.set({ key: ONBOARDING_SEEN_KEY, value: 'true' });
	}
}

export const onboarding = new OnboardingState();
