import { z } from "zod";

export const householdNameSchema = z.object({ name: z.string().trim().min(1).max(60) });
