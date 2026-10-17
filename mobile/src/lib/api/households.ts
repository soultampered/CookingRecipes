import { apiFetch } from './client';

// STO-88
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

// STO-8
export function createInvite(id: string) {
	return apiFetch<Household>(`/households/${id}/invite`, { method: 'POST' });
}

export function revokeInvite(id: string) {
	return apiFetch<Household>(`/households/${id}/invite`, { method: 'DELETE' });
}

export function joinHousehold(code: string) {
	return apiFetch<Household>('/households/join', { method: 'POST', body: JSON.stringify({ code }) });
}

export function leaveHousehold(id: string) {
	return apiFetch<void>(`/households/${id}/leave`, { method: 'POST' });
}

export function removeMember(id: string, memberId: string) {
	return apiFetch<Household>(`/households/${id}/members/${memberId}`, { method: 'DELETE' });
}
