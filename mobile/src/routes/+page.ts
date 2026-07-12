import { redirect } from '@sveltejs/kit';
import { session, sessionRestored } from '$lib/state/session.svelte';

export const load = async () => {
	await sessionRestored;
	if (!session.user) throw redirect(302, '/welcome');
	if (!session.user.emailVerified) throw redirect(302, '/verify-email');
	throw redirect(302, '/dashboard');
};
