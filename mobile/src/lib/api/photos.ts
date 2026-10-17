import { apiFetch } from './client';

// Raw image body; the API sniffs it.
export function uploadPhoto(image: Blob) {
	return apiFetch<{ id: string; url: string }>('/photos', {
		method: 'POST',
		headers: { 'Content-Type': image.type || 'image/jpeg' },
		body: image
	});
}
