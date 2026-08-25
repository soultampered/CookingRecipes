// Extracted from STO-6's shopping-list-item implementation so every other list (shopping
// lists, inventory, recipes — see STO-105) can reuse the same pointer-events drag state
// machine instead of copy-pasting it. One instance covers a whole list, keyed by item id.
const SWIPE_OPEN = -76;
const SWIPE_THRESHOLD = -40;

export function swipeToDelete() {
	let offsets = $state<Record<string, number>>({});
	let dragId = $state<string | null>(null);
	let dragStartX = 0;
	let dragStartOffset = 0;
	let moved = false;

	function offsetFor(id: string): number {
		return offsets[id] ?? 0;
	}

	function isDragging(id: string): boolean {
		return dragId === id;
	}

	function close(id: string) {
		offsets = { ...offsets, [id]: 0 };
	}

	function onPointerDown(e: PointerEvent, id: string) {
		dragId = id;
		dragStartX = e.clientX;
		dragStartOffset = offsets[id] ?? 0;
		moved = false;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent, id: string) {
		if (dragId !== id) return;
		const delta = e.clientX - dragStartX;
		if (Math.abs(delta) > 4) moved = true;
		const next = Math.min(0, Math.max(dragStartOffset + delta, SWIPE_OPEN));
		offsets = { ...offsets, [id]: next };
	}

	function onPointerUp(id: string) {
		if (dragId !== id) return;
		dragId = null;
		const current = offsets[id] ?? 0;
		offsets = { ...offsets, [id]: current <= SWIPE_THRESHOLD ? SWIPE_OPEN : 0 };
	}

	// For swipeable elements that are themselves a native link/button (as opposed to STO-6's
	// original div-wrapped-in-a-separate-link case): a real <a>'s click fires on mouseup
	// regardless of how far the pointer moved in between (unlike touch, which has its own
	// scroll/drag suppression heuristics) — without this, a mouse-drag swipe on desktop would
	// still navigate on release. Also closes an already-open swipe on a plain tap instead of
	// navigating, matching the common "tap elsewhere closes it" swipe-list convention.
	function handleClick(e: MouseEvent, id: string) {
		if (moved || offsetFor(id) !== 0) {
			e.preventDefault();
			close(id);
		}
	}

	return {
		offsetFor,
		isDragging,
		close,
		onPointerDown,
		onPointerMove,
		onPointerUp,
		handleClick
	};
}
