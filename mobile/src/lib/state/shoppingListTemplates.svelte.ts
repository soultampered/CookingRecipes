import { Preferences } from '@capacitor/preferences';

export interface TemplateItem {
	name: string;
	quantity: number;
}

export interface ShoppingListTemplate {
	id: string;
	name: string;
	items: TemplateItem[];
}

const TEMPLATES_KEY = 'stokpot.shoppingListTemplates';

// Templates are a device-local convenience layer, not server data — there's no backend
// concept of a "template" (see ticket), so this mirrors the client-only Preferences pattern
// already used for categoryOrder/shoppingListOrder rather than adding an API endpoint.
class ShoppingListTemplatesState {
	current = $state<ShoppingListTemplate[]>([]);

	async restore() {
		const { value } = await Preferences.get({ key: TEMPLATES_KEY });
		if (!value) return;
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) this.current = parsed;
		} catch {
			// Corrupt value — ignore and keep the default (empty).
		}
	}

	private async persist() {
		await Preferences.set({ key: TEMPLATES_KEY, value: JSON.stringify(this.current) });
	}

	async save(name: string, items: TemplateItem[]) {
		const template: ShoppingListTemplate = { id: crypto.randomUUID(), name, items };
		this.current = [...this.current, template];
		await this.persist();
	}

	async remove(id: string) {
		this.current = this.current.filter((t) => t.id !== id);
		await this.persist();
	}
}

export const shoppingListTemplates = new ShoppingListTemplatesState();
