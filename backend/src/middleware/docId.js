import { body, param } from "express-validator";

/** UUID document id (Firestore). */
export const docIdBody = (field) => body(field).isString().trim().notEmpty().withMessage("Invalid id");

export const docIdParam = (field) => param(field).isString().trim().notEmpty().withMessage("Invalid id");

export const docIdOptionalBody = (field) => body(field).optional().isString().trim().notEmpty().withMessage("Invalid id");
