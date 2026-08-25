// HTML5 native drag-and-drop (`draggable`, dragstart/dragover/drop) has effectively no
// support for touch input in iOS WKWebView or Android's Chromium-based WebView — the two
// environments this app ever actually runs in as a Capacitor app — so this is a hand-rolled
// pointer-events implementation, in the same spirit as swipeToDelete.svelte.ts (STO-105) but
// for vertical reordering instead of a horizontal reveal.
//
// Unlike swipeToDelete, this measures actual DOM positions (via registerRef) rather than
// doing fixed-row-height math, since rows can have variable height (e.g. a multi-line
// instruction textarea). The reorder itself is resolved once on release by comparing the
// dragged item's live center against every sibling's midpoint — not continuously during the
// drag — keeping this composable's own state simple; callers that want live reflow of
// siblings while dragging get it for free from Svelte's `animate:flip` on their keyed
// {#each} block once the backing array actually reorders.
export function dragToReorder() {
	let draggingId = $state<string | null>(null);
	let dragOffsetY = $state(0);
	let startY = 0;
	let startRect: DOMRect | null = null;
	const refs = new Map<string, HTMLElement>();

	function registerRef(id: string, el: HTMLElement | null) {
		if (el) refs.set(id, el);
		else refs.delete(id);
	}

	function isDragging(id: string): boolean {
		return draggingId === id;
	}

	function offsetFor(id: string): number {
		return draggingId === id ? dragOffsetY : 0;
	}

	function onPointerDown(e: PointerEvent, id: string) {
		const el = refs.get(id);
		if (!el) return;
		draggingId = id;
		startY = e.clientY;
		startRect = el.getBoundingClientRect();
		dragOffsetY = 0;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent, id: string) {
		if (draggingId !== id) return;
		dragOffsetY = e.clientY - startY;
	}

	function resolveIndex(orderedIds: string[], draggedId: string): number {
		if (!startRect) return orderedIds.indexOf(draggedId);
		const draggedCenter = startRect.top + startRect.height / 2 + dragOffsetY;
		let index = 0;
		for (const id of orderedIds) {
			if (id === draggedId) continue;
			const el = refs.get(id);
			if (!el) continue;
			const rect = el.getBoundingClientRect();
			if (draggedCenter > rect.top + rect.height / 2) index++;
		}
		return index;
	}

	function onPointerUp(
		id: string,
		orderedIds: string[],
		onReorder: (fromIndex: number, toIndex: number) => void
	) {
		if (draggingId !== id) return;
		const fromIndex = orderedIds.indexOf(id);
		const toIndex = resolveIndex(orderedIds, id);
		draggingId = null;
		dragOffsetY = 0;
		startRect = null;
		if (toIndex !== fromIndex && toIndex >= 0 && fromIndex >= 0) onReorder(fromIndex, toIndex);
	}

	function cancel() {
		draggingId = null;
		dragOffsetY = 0;
		startRect = null;
	}

	return {
		registerRef,
		isDragging,
		offsetFor,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		cancel
	};
}
