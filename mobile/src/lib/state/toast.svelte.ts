interface Toast {
	id: number;
	message: string;
	type: 'error' | 'info';
}

let nextId = 1;

class ToastState {
	items = $state<Toast[]>([]);
	private timeoutId: ReturnType<typeof setTimeout> | undefined;

	push(message: string, type: Toast['type'] = 'error') {
		// STO-109: only ever show one toast at a time. Two near-simultaneous pushes (e.g. a
		// session-expiry toast racing a login-failure toast) used to stack, growing the
		// toasts container's height upward from its bottom anchor — on a short, no-NavBar
		// auth screen with the keyboard up (which pushes that same anchor further up), a
		// multi-toast stack could reach as high as the input fields themselves. Replacing
		// instead of stacking bounds the container to a single message's height no matter
		// how many pushes happen close together.
		clearTimeout(this.timeoutId);
		const id = nextId++;
		this.items = [{ id, message, type }];
		// Errors get longer on screen than success/info confirmations — they usually need
		// reading and a decision, where a confirmation just needs a glance.
		this.timeoutId = setTimeout(() => this.dismiss(id), type === 'error' ? 5000 : 3000);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastState();
