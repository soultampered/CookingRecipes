import { apiFetch } from './client';

export interface Household {
	_id: string;
	name: string;
	ownerId: string;
	isOwner: boolean;
	members: { _id: string; username: string; displayName?: string }[];
	inviteCode?: string | null;
}

export function listHouseholds() {
	return apiFetch<Household[]>('/households');
}

export function createHousehold(name: string) {
	return apiFetch<Household>('/households', { method: 'POST', body: JSON.stringify({ name }) });
}

export function renameHousehold(id: string, name: string) {
	return apiFetch<Household>(`/households/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export function deleteHousehold(id: string) {
	return apiFetch<void>(`/households/${id}`, { method: 'DELETE' });
}
