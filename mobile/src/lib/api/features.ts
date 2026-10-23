import { apiFetch } from './client';
import type { FeatureKey } from '$lib/features';

export function getFeatures() {
	return apiFetch<{ enabled: FeatureKey[] }>('/features');
}
