export interface User {
    _id?: string;
    username: string;
    email: string;
    password: string; // I think I need to hash this
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    savedRecipes?: string[];
    createdRecipes?: string[];

    preferences?: {
        dietaryRestrictions?: string[];
        preferredUnits?: "metric" | "imperial";
        theme?: "light" | "dark"
    };
    createdAt?: string;
    updatedAt?: string;
}