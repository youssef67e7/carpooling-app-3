import { validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array({ onlyFirstError: false }).map((e) => ({
      field: e.path,
      msg: e.msg,
    }));
    const first = list[0];
    return res.status(400).json({
      message: first ? `${first.field}: ${first.msg}` : "Validation failed",
      errors: list,
    });
  }
  next();
}
