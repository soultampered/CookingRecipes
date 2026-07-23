import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'ca.stokpot.app',
	appName: 'Stokpot',
	webDir: 'build',
	plugins: {
		Keyboard: {
			// iOS's native webview otherwise auto-shifts/resizes its own content when the
			// keyboard appears, and can leave that shift applied after the keyboard dismisses —
			// this is the root cause of the nav-bar-needs-a-scroll bug, at the native layer, not
			// something any CSS/JS-side fix inside the page can control. Telling iOS not to
			// resize anything itself hands full control back to our own CSS layout.
			resize: 'none'
		}
	}
};

export default config;
