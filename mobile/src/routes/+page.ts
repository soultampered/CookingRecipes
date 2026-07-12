import { redirect } from '@sveltejs/kit';
import { session } from '$lib/state/session.svelte';

export const load = async () => {
	if (!session.ready) await session.restore();
	throw redirect(302, session.userId ? '/recipes' : '/welcome');
};
