// HTML5 native drag-and-drop (`draggable`, dragstart/dragover/drop) has effectively no
// support for touch input in iOS WKWebView or Android's Chromium-based WebView — the two
// environments this app ever actually runs in as a Capacitor app — so this is a hand-rolled
// pointer-events implementation, in the same spirit as swipeToDelete.svelte.ts (STO-105) but
// for vertical reordering instead of a horizontal reveal.
//
// The target index is resolved from pixel distance moved ÷ row spacing (measured once at
// drag-start, from this row to its immediate next sibling), not by re-querying sibling
// getBoundingClientRect() on every move. An earlier version did the latter and it was janky —
// a sibling is mid-flight in its own ~200ms animate:flip animation right after a live reorder,
// so comparing against its rect mid-animation feeds the index calculation a moving target,
// which can trigger another reorder, whose own flip destabilizes the next comparison, and so
// on. Distance-based math is immune to that: it's a pure function of the pointer's total
// travel since drag-start, independent of any sibling's current animation state.
export function dragToReorder() {
	let draggingId = $state<string | null>(null);
	let dragOffsetY = $state(0);
	let startY = 0;
	let startIndex = 0;
	let rowSize = 0;
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

	function onPointerDown(e: PointerEvent, id: string, orderedIds: string[]) {
		const el = refs.get(id);
		if (!el) return;
		draggingId = id;
		startY = e.clientY;
		dragOffsetY = 0;
		startIndex = orderedIds.indexOf(id);

		const rect = el.getBoundingClientRect();
		const nextId = orderedIds[startIndex + 1];
		const nextEl = nextId ? refs.get(nextId) : undefined;
		const prevId = orderedIds[startIndex - 1];
		const prevEl = prevId ? refs.get(prevId) : undefined;
		// Prefer the gap to the next row; fall back to the gap from the previous row (last
		// item in the list) — either gives the real row-to-row spacing including this row's
		// own height and any CSS gap between them.
		rowSize = nextEl
			? nextEl.getBoundingClientRect().top - rect.top
			: prevEl
				? rect.top - prevEl.getBoundingClientRect().top
				: 0;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(
		e: PointerEvent,
		id: string,
		orderedIds: string[],
		onReorder: (fromIndex: number, toIndex: number) => void
	) {
		if (draggingId !== id) return;
		dragOffsetY = e.clientY - startY;
		if (!rowSize) return;
		const delta = Math.round(dragOffsetY / rowSize);
		const toIndex = Math.max(0, Math.min(orderedIds.length - 1, startIndex + delta));
		const fromIndex = orderedIds.indexOf(id);
		if (toIndex !== fromIndex && fromIndex >= 0) onReorder(fromIndex, toIndex);
	}

	function onPointerUp(id: string) {
		if (draggingId !== id) return;
		draggingId = null;
		dragOffsetY = 0;
		rowSize = 0;
	}

	function cancel() {
		draggingId = null;
		dragOffsetY = 0;
		rowSize = 0;
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
