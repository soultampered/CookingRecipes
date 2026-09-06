import { zValidator } from "@hono/zod-validator";
import type { ZodType } from "zod";

// c.req.json<T>() only asserts a TypeScript type at compile time — it does nothing at
// runtime to stop a client from sending the wrong shape entirely (STO-51). This wraps
// zValidator so every route gets the same {error, details} shape on a validation
// failure, matching the rest of the API's error convention instead of zod's raw
// {success, error} object.
export function validateJson<T extends ZodType>(schema: T) {
    return zValidator("json", schema, (result, c) => {
        if (!result.success) {
            return c.json(
                {
                    error: "Invalid request body",
                    details: result.error.issues.map((issue) => ({
                        path: issue.path.join("."),
                        message: issue.message
                    }))
                },
                400
            );
        }
    });
}
