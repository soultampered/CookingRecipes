import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// Live on-screen-keyboard height (px). `capacitor.config.ts` sets `Keyboard.resize:
// 'none'` on BOTH platforms, so the webview is never resized/scrolled for the keyboard
// — it just overlays the bottom of the screen. Anything `position: fixed` to the
// viewport (main's scroll padding, Toast, the ConfirmModal backdrop, the docked
// add-item bar — STO-110) needs this tracked height to stay clear of that overlay.
//
// iOS fires keyboardWill{Show,Hide}; Android fires keyboardDid{Show,Hide}. Registering
// both pairs is harmless — the unused pair just never fires on a given platform.
class KeyboardInsetState {
	current = $state(0);

	watch() {
		// WKWebView-specific: stop iOS from scrolling its native UIScrollView to keep the
		// focused input above the keyboard (that scroll is what used to drag the nav bar).
		if (Capacitor.getPlatform() === 'ios') {
			Keyboard.setScroll({ isDisabled: true });
		}

		const show = (info: { keyboardHeight: number }) => {
			this.current = info.keyboardHeight;
		};
		const hide = () => {
			this.current = 0;
		};

		const handles = [
			Keyboard.addListener('keyboardWillShow', show),
			Keyboard.addListener('keyboardWillHide', hide),
			Keyboard.addListener('keyboardDidShow', show),
			Keyboard.addListener('keyboardDidHide', hide)
		];

		return () => {
			for (const h of handles) h.then((handle) => handle.remove());
		};
	}
}

export const keyboardInset = new KeyboardInsetState();
