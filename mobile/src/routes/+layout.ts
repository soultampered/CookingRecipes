import { sessionRestored } from '$lib/state/session.svelte';

export const ssr = false;
export const prerender = false;

export const load = async () => {
	await sessionRestored;
};
