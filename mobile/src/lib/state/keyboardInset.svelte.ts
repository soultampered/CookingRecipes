import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

// With Keyboard.setScroll({ isDisabled: true }) (see watch() below), iOS never resizes or
// scrolls the WKWebView for the on-screen keyboard — it just overlays the bottom of the
// screen. Anything `position: fixed` to the viewport (main's scroll padding, Toast, the
// ConfirmModal backdrop) needs this tracked height to stay clear of that overlay.
class KeyboardInsetState {
	current = $state(0);

	watch() {
		if (Capacitor.getPlatform() !== 'ios') return () => {};

		Keyboard.setScroll({ isDisabled: true });

		const showHandle = Keyboard.addListener('keyboardWillShow', (info) => {
			this.current = info.keyboardHeight;
		});
		const hideHandle = Keyboard.addListener('keyboardWillHide', () => {
			this.current = 0;
		});

		return () => {
			showHandle.then((h) => h.remove());
			hideHandle.then((h) => h.remove());
		};
	}
}

export const keyboardInset = new KeyboardInsetState();
