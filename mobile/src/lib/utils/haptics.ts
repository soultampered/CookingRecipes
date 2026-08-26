import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Every call is best-effort — web (and any platform without haptics support) rejects, and
// that should never surface as a user-visible error for what's purely tactile polish.
async function impact(style: ImpactStyle) {
	try {
		await Haptics.impact({ style });
	} catch {
		// No-op.
	}
}

export function hapticLight() {
	void impact(ImpactStyle.Light);
}

export function hapticMedium() {
	void impact(ImpactStyle.Medium);
}
