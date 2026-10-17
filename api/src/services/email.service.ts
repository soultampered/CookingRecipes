async function send(to: string, subject: string, text: string): Promise<void> {
    // Local dev only (explicit opt-in): print instead of calling Resend.
    if (process.env.EMAIL_DEV_LOG === "1") {
        console.log(`[email:dev] to=${to} subject="${subject}"\n${text}`);
        return;
    }
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: "Stokpot <noreply@stokpot.ca>", to, subject, text })
    });

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Failed to send email: ${res.status} ${body}`);
    }
}

export const emailService = {
    async sendVerificationEmail(to: string, code: string): Promise<void> {
        await send(
            to,
            "Your Stokpot verification code",
            `Your verification code is ${code}. It expires in 10 minutes.`
        );
    },

    async sendLoginCode(to: string, code: string): Promise<void> {
        await send(
            to,
            "Your Stokpot sign-in code",
            `Your sign-in code is ${code}. It expires in 10 minutes. If you didn't just try to sign in, change your password.`
        );
    },

    async sendPasswordResetEmail(to: string, code: string): Promise<void> {
        await send(
            to,
            "Your Stokpot password reset code",
            `Your password reset code is ${code}. It expires in 10 minutes. Nothing changes on your account unless this code is used — but if you didn't request this, you may want to change your password soon just in case.`
        );
    }
};
