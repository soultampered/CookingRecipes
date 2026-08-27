const MIN_LENGTH = 8;

export function isPasswordStrong(password: string): boolean {
    if (password.length < MIN_LENGTH) return false;
    if (!/[A-Za-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    return true;
}
