import { getShoppingList } from '$lib/api/shoppingLists';
import { listInventory } from '$lib/api/inventory';
import { getPriceInsights, type PriceInsight } from '$lib/api/prices';
import { getIntegrationStatus } from '$lib/api/integrations';

export const load = async ({ params, depends }) => {
	depends(`app:shopping-list:${params.id}`);
	// All loads start together; price hints wait only for the list.
	const listRequest = getShoppingList(params.id);
	// Never block the list on price hints.
	const pricesRequest = listRequest
		.then((l) => getPriceInsights(l.items.map((i) => i.name)))
		.catch((): Record<string, PriceInsight> => ({}));
	// Only offer Instacart when the server has a key.
	const integrationsRequest = getIntegrationStatus().catch(() => ({ instacart: false }));
	const [list, inventory] = await Promise.all([listRequest, listInventory()]);

	// STO-54: "recently used" names for quick-add chips, sourced from Inventory since
	// removeItem is destructive and retains no shopping-list history of its own (see ticket).
	// Most-recently-touched first, deduped case-insensitively, excluding names already on
	// this list so the chips only ever offer something worth tapping.
	const onList = new Set(list.items.map((i) => i.name.trim().toLowerCase()));
	const seen = new Set<string>();
	const recentNames: string[] = [];
	for (const item of [...inventory].sort(
		(a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()
	)) {
		const key = item.name.trim().toLowerCase();
		if (!key || seen.has(key) || onList.has(key)) continue;
		seen.add(key);
		recentNames.push(item.name);
		if (recentNames.length >= 12) break;
	}

	const [prices, integrations] = await Promise.all([pricesRequest, integrationsRequest]);

	return { list, recentNames, prices, instacartEnabled: integrations.instacart };
};
