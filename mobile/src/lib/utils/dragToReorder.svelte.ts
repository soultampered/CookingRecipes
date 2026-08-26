// HTML5 native drag-and-drop (`draggable`, dragstart/dragover/drop) has effectively no
// support for touch input in iOS WKWebView or Android's Chromium-based WebView — the two
// environments this app ever actually runs in as a Capacitor app — so this is a hand-rolled
// pointer-events implementation, in the same spirit as swipeToDelete.svelte.ts (STO-105) but
// for vertical reordering instead of a horizontal reveal.
//
// The dragged row's own position in the backing array is NEVER touched mid-drag — only once,
// on release. Two earlier versions got this wrong:
//   1. Resolving the reorder only on release, with no live feedback: the only thing visibly
//      moving during the drag was the held row itself, siblings stayed static — looked broken.
//   2. Live-reordering the array on every pointermove (via a live index resolved by
//      re-querying sibling getBoundingClientRect()): this fixed the previous problem but broke
//      the drag itself. The dragged row's transform is a raw 1:1 pointer-offset delta, which
//      is only valid as long as the row's own *natural* (untransformed) position never moves.
//      Reordering the array moves it to a new index in the keyed {#each} every time a sibling
//      is crossed — its natural position jumps by ~one row height with nothing to compensate,
//      so the held row visually jumped ahead of the pointer on every crossing, compounding
//      over a longer drag ("moves faster than my thumb").
//
// This version gets both right by never moving the dragged row's array position during the
// drag at all: `offsetFor` returns the raw pointer delta for the dragged row (always valid,
// since its natural position is frozen for the whole gesture) and a computed ±one-row-height
// shift for whichever siblings currently sit between the drag's start and live target index
// (open a gap without reordering anything). The real splice only happens once, in the
// onReorder callback fired from onPointerUp.
export function dragToReorder() {
	let draggingId = $state<string | null>(null);
	let dragOffsetY = $state(0);
	let startY = 0;
	let startIndex = 0;
	let targetIndex = $state(0);
	let rowSize = 0;
	const refs = new Map<string, HTMLElement>();

	function registerRef(id: string, el: HTMLElement | null) {
		if (el) refs.set(id, el);
		else refs.delete(id);
	}

	function isDragging(id: string): boolean {
		return draggingId === id;
	}

	function offsetFor(id: string, orderedIds: string[]): number {
		if (draggingId === id) return dragOffsetY;
		if (!draggingId) return 0;
		const index = orderedIds.indexOf(id);
		if (index < 0) return 0;
		if (startIndex < targetIndex && index > startIndex && index <= targetIndex) return -rowSize;
		if (startIndex > targetIndex && index < startIndex && index >= targetIndex) return rowSize;
		return 0;
	}

	function onPointerDown(e: PointerEvent, id: string, orderedIds: string[]) {
		const el = refs.get(id);
		if (!el) return;
		draggingId = id;
		startY = e.clientY;
		dragOffsetY = 0;
		startIndex = orderedIds.indexOf(id);
		targetIndex = startIndex;

		const rect = el.getBoundingClientRect();
		const nextId = orderedIds[startIndex + 1];
		const nextEl = nextId ? refs.get(nextId) : undefined;
		const prevId = orderedIds[startIndex - 1];
		const prevEl = prevId ? refs.get(prevId) : undefined;
		// Row spacing (this row to its immediate next/previous sibling), measured once —
		// re-measuring on every move would reintroduce the same class of instability the drag
		// composable used to have before this rewrite.
		rowSize = nextEl
			? nextEl.getBoundingClientRect().top - rect.top
			: prevEl
				? rect.top - prevEl.getBoundingClientRect().top
				: 0;

		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent, id: string, orderedIds: string[]) {
		if (draggingId !== id) return;
		dragOffsetY = e.clientY - startY;
		if (!rowSize) return;
		const delta = Math.round(dragOffsetY / rowSize);
		targetIndex = Math.max(0, Math.min(orderedIds.length - 1, startIndex + delta));
	}

	function onPointerUp(id: string, onReorder: (fromIndex: number, toIndex: number) => void) {
		if (draggingId !== id) return;
		const fromIndex = startIndex;
		const toIndex = targetIndex;
		draggingId = null;
		dragOffsetY = 0;
		rowSize = 0;
		if (toIndex !== fromIndex) onReorder(fromIndex, toIndex);
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
