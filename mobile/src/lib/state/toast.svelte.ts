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
		setTimeout(() => this.dismiss(id), 4000);
	}

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastState();
