// Rotation plan: to rotate JWT_SECRET without instantly invalidating every logged-in
// session, deploy in two steps.
//   1. Set JWT_SECRET_PREVIOUS to the current (soon-to-be-old) JWT_SECRET value, and
//      JWT_SECRET to a freshly generated one. New tokens are signed with the new secret;
//      tokens already out there signed with the old one still verify against
//      JWT_SECRET_PREVIOUS until they naturally expire (15m access tokens, so this window
//      only needs to outlive that).
//   2. Once enough time has passed that no token signed with the old secret can still be
//      valid (comfortably more than the 15m access token TTL), remove JWT_SECRET_PREVIOUS.
export const signingSecret = process.env.JWT_SECRET!;

export const verificationSecrets = [process.env.JWT_SECRET!, process.env.JWT_SECRET_PREVIOUS].filter(
    (secret): secret is string => Boolean(secret)
);
