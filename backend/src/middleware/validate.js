import { ZodError } from "zod";

/**
 * Express middleware that validates req[source] against a Zod schema.
 * On success, calls next() without modifying req[source].
 * On failure, returns 400 with field-level error details.
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.safeParse(req[source]);
      if (!parsed.success) {
        const errors = parsed.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors,
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
