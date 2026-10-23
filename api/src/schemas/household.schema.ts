import { z } from "zod";

export const householdNameSchema = z.object({ name: z.string().trim().min(1).max(60) });

export const joinHouseholdSchema = z.object({ code: z.string().trim().min(6).max(12) });
