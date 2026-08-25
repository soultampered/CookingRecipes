import { beforeNavigate, goto } from '$app/navigation';

// SvelteKit's beforeNavigate fires for link clicks, goto(), and back/forward (popstate) alike, so
// this covers hardware back too, not just in-app nav links.
export function unsavedChangesGuard(isDirty: () => boolean) {
	let confirming = $state(false);
	let allow = false;
	let pendingUrl: string | null = null;

	beforeNavigate((nav) => {
		if (allow || !isDirty()) return;
		nav.cancel();
		pendingUrl = nav.to?.url.href ?? null;
		confirming = true;
	});

	function confirmLeave() {
		allow = true;
		confirming = false;
		if (pendingUrl) goto(pendingUrl);
	}

	function cancelLeave() {
		confirming = false;
		pendingUrl = null;
	}

	// Call before a programmatic goto() that should bypass the guard (e.g. after a successful save).
	function allowNext() {
		allow = true;
	}

	return {
		get confirming() {
			return confirming;
		},
		confirmLeave,
		cancelLeave,
		allowNext
	};
}
