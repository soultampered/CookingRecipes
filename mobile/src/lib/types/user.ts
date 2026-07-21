// Mirrors src/types/user.ts (ObjectId/Date fields become string over the wire)
export interface User {
	_id?: string;
	username: string;
	email: string;
	displayName?: string;
	avatarUrl?: string;
	bio?: string;
	savedRecipes?: string[];
	createdRecipes?: string[];
	emailVerified: boolean;
	mustResetPassword: boolean;
	preferences?: {
		dietaryRestrictions?: string[];
		preferredUnits?: 'metric' | 'imperial';
		theme?: 'light' | 'dark';
	};
	createdAt?: string;
	updatedAt?: string;
}
