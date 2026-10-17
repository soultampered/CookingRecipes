import { apiFetch } from './client';

// STO-19: raw image body; the API sniffs the bytes.
export function uploadPhoto(image: Blob) {
	return apiFetch<{ id: string; url: string }>('/photos', {
		method: 'POST',
		headers: { 'Content-Type': image.type || 'image/jpeg' },
		body: image
	});
}
