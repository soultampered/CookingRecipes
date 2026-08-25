interface Toast {
	id: number;
	message: string;
	type: 'error' | 'info';
}

let nextId = 1;

class ToastState {
	items = $state<Toast[]>([]);

	push(message: string, type: Toast['type'] = 'error') {
		const id = nextId++;
		this.items.push({ id, message, type });
		// Errors get longer on screen than success/info confirmations — they usually need
		// reading and a decision, where a confirmation just needs a glance.
		setTimeout(() => this.dismiss(id), type === 'error' ? 5000 : 3000);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastState();
