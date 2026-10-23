import { Capacitor } from '@capacitor/core';
import { features } from './features.svelte';

// Web is view-only until webEditing (2.6); edit entry points check this.
const native = Capacitor.isNativePlatform();

export const writes = {
	get allowed(): boolean {
		return native || features.has('webEditing');
	}
};
