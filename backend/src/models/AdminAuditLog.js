import { createModel } from "../mongo/odm.js";

export const AdminAuditLog = createModel("adminAuditLogs", {
  modelName: "AdminAuditLog",
  refFields: {
    actorAdminId: "User",
    targetId: "User",
  },
});
