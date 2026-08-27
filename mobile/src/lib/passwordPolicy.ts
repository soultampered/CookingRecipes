// Mirrors api/src/services/passwordPolicy.ts — at least 8 characters, one letter, one number.
export const PASSWORD_PATTERN = String.raw`(?=.*[A-Za-z])(?=.*[0-9]).{8,}`;
