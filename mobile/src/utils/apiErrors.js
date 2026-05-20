/** Human-readable message from axios / API validation errors. */
export function formatApiError(error, t) {
  const data = error?.response?.data;
  const errors = data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const lines = errors.map((e) => {
      const field = e.field || e.param || "";
      const msg = e.msg || e.message || "";
      return field ? `${field}: ${msg}` : msg;
    });
    return lines.filter(Boolean).join("\n");
  }
  const msg = data?.message || error?.message;
  if (msg && msg !== "Validation failed") return String(msg);
  if (msg === "Validation failed") return t?.("validationFailedHint") || msg;
  return t?.("requestFailed") || "Request failed";
}
