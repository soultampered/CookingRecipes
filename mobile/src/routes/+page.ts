import { redirect } from '@sveltejs/kit';
import { session, sessionRestored } from '$lib/state/session.svelte';

export const load = async () => {
	await sessionRestored;
	throw redirect(302, session.user ? '/dashboard' : '/welcome');
};
