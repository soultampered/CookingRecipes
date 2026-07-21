async function send(to: string, subject: string, text: string): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: "onboarding@resend.dev", to, subject, text })
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
            "Your Larder verification code",
            `Your verification code is ${code}. It expires in 10 minutes.`
        );
    },

    async sendPasswordResetEmail(to: string, code: string): Promise<void> {
        await send(
            to,
            "Your Larder password reset code",
            `Your password reset code is ${code}. It expires in 10 minutes. Nothing changes on your account unless this code is used — but if you didn't request this, you may want to change your password soon just in case.`
        );
    }
};
