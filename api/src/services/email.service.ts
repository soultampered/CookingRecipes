export const emailService = {
    async sendVerificationEmail(to: string, code: string): Promise<void> {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "onboarding@resend.dev",
                to,
                subject: "Your Larder verification code",
                text: `Your verification code is ${code}. It expires in 10 minutes.`
            })
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`Failed to send verification email: ${res.status} ${body}`);
        }
    }
};
