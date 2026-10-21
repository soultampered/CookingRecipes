import { getFeatures } from '$lib/api/features';
import type { FeatureKey } from '$lib/features';

// Flags on for this user. Only hides entry points (the API enforces). Refreshed on sign-in and resume.
class FeaturesState {
	enabled = $state<ReadonlySet<FeatureKey>>(new Set());

	has(key: FeatureKey): boolean {
		return this.enabled.has(key);
	}

	async refresh() {
		try {
			this.enabled = new Set((await getFeatures()).enabled);
		} catch {
			// offline etc. — keep the last known set
		}
	}

	clear() {
		this.enabled = new Set();
	}
}

export const features = new FeaturesState();
