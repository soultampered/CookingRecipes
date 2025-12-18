import type { ObjectId } from "mongodb";

export interface User {
    _id?: ObjectId;
    username: string;
    email: string;
    password: string; // I think I'll need to hash this
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
    createdAt?: Date;
    updatedAt?: Date;
}