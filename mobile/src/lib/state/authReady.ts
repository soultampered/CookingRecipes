let resolveReady: () => void;

export const authReady = new Promise<void>((resolve) => {
	resolveReady = resolve;
});

export function markAuthReady() {
	resolveReady();
}
