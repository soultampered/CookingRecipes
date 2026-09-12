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
//
// STO-114: this used to be bound to a dedicated grip-icon button, so any pointerdown on it
// unambiguously meant "start dragging." Now it's bound to the whole row, which also has to
// remain tap-able (open the item) and vertically scrollable (it's a nornal list). A press is
// only promoted to an actual drag after HOLD_DELAY ms with no more than JITTER_TOLERANCE px of
// movement — same "long-press to reorder" convention as iOS/Android list apps. This is also
// what keeps native scrolling working for free: a real scroll swipe moves past the jitter
// tolerance almost immediately and abandons the pending press, or the browser recognizes the
// pan itself and fires pointercancel before the hold timer ever fires. touch-action stays at
// its default (scrollable) for the row until the hold is confirmed — it only flips to `none`
// (in the consumer's markup, keyed off isDragging) at the moment of promotion, by which point
// no scroll gesture has been able to start yet.
//
// Some rows (shopping-lists, inventory) also run swipeToDelete.svelte.ts on the same row for a
// horizontal reveal-to-delete. swipeToDelete has no arming delay of its own — it starts tracking
// the instant its onPointerDown is called — so it must never be called from the same raw
// pointerdown as this util; instead the consumer passes `onHorizontalReject`, invoked exactly
// once, only when a pending press is abandoned because the movement that broke it was
// horizontal-dominant (as opposed to vertical/scroll, which is abandoned silently as before).
// That's the caller's cue to hand the *current* event to swipeToDelete.onPointerDown as its
// anchor, so the two gestures never both hold live pointer-capture state from one touch.
const HOLD_DELAY = 350;
const JITTER_TOLERANCE = 10;
// A press starting on one of these must keep its native behavior untouched (focus, native
// text-selection callout on a textarea, a remove/delete/badge button's tap) rather than ever
// arming a pending drag. Deliberately excludes `a`: these rows commonly use an anchor as the
// *entire* row's tap target (RecipeCard, the inventory/shopping-list row-link), not a small link
// inside otherwise-plain content — excluding anchors here would leave almost nothing left to
// grab. This app only ever runs inside a Capacitor WebView, never a real browser tab, so there's
// no native long-press-link menu being taken away by that choice.
const INTERACTIVE_SELECTOR = 'input, textarea, select, button, [contenteditable="true"], [role="button"]';

export function dragToReorder() {
	let draggingId = $state<string | null>(null);
	let dragOffsetY = $state(0);
	let startY = 0;
	let startX = 0;
	let startIndex = 0;
	let targetIndex = $state(0);
	let rowSize = 0;
	let pendingId: string | null = null;
	let holdTimer: ReturnType<typeof setTimeout> | null = null;
	let onHorizontalReject: ((e: PointerEvent) => void) | null = null;
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

	function promote(id: string, orderedIds: string[]) {
		holdTimer = null;
		if (pendingId !== id) return;
		pendingId = null;
		const el = refs.get(id);
		if (!el) return;
		draggingId = id;
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
	}

	function onPointerDown(
		e: PointerEvent,
		id: string,
		orderedIds: string[],
		onReject?: (e: PointerEvent) => void
	) {
		const el = refs.get(id);
		if (!el) return;
		if (e.target instanceof Element && e.target.closest(INTERACTIVE_SELECTOR)) return;
		pendingId = id;
		startY = e.clientY;
		startX = e.clientX;
		dragOffsetY = 0;
		onHorizontalReject = onReject ?? null;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		holdTimer = setTimeout(() => promote(id, orderedIds), HOLD_DELAY);
	}

	function onPointerMove(e: PointerEvent, id: string, orderedIds: string[]) {
		if (pendingId === id) {
			const dx = e.clientX - startX;
			const dy = e.clientY - startY;
			if (Math.hypot(dx, dy) > JITTER_TOLERANCE) {
				// Real movement before the hold armed — this is a scroll/swipe/tap gesture, not
				// a press-and-hold. Drop the pending drag; if the movement was horizontal-
				// dominant, hand off to the caller's swipe gesture (see onHorizontalReject
				// above). Vertical-dominant movement is abandoned silently and left to native
				// scroll, same as a row with no competing gesture.
				if (holdTimer) clearTimeout(holdTimer);
				holdTimer = null;
				pendingId = null;
				if (Math.abs(dx) > Math.abs(dy)) onHorizontalReject?.(e);
				onHorizontalReject = null;
			}
			return;
		}
		if (draggingId !== id) return;
		dragOffsetY = e.clientY - startY;
		if (!rowSize) return;
		const delta = Math.round(dragOffsetY / rowSize);
		targetIndex = Math.max(0, Math.min(orderedIds.length - 1, startIndex + delta));
	}

	function onPointerUp(id: string, onReorder: (fromIndex: number, toIndex: number) => void) {
		if (holdTimer) clearTimeout(holdTimer);
		holdTimer = null;
		onHorizontalReject = null;
		if (pendingId === id) {
			pendingId = null;
			return;
		}
		if (draggingId !== id) return;
		const fromIndex = startIndex;
		const toIndex = targetIndex;
		draggingId = null;
		dragOffsetY = 0;
		rowSize = 0;
		if (toIndex !== fromIndex) onReorder(fromIndex, toIndex);
	}

	function cancel() {
		if (holdTimer) clearTimeout(holdTimer);
		holdTimer = null;
		onHorizontalReject = null;
		pendingId = null;
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
