/** Driver onboarding verification progress (MongoDB driver_profiles + users). */

export function verificationProgress(user, profile) {
  const appStatus = user?.driver_application_status || user?.driverApplicationStatus || "none";
  const profStatus = profile?.status || "none";
  const steps = {
    personalInfo: appStatus === "none" ? "pending" : "completed",
    identityDocs: profile?.licenseImageUrl
      ? profStatus === "approved"
        ? "verified"
        : "under_review"
      : "pending",
    vehicleReg:
      Array.isArray(profile?.cars) && profile.cars.length
        ? profStatus === "approved"
          ? "verified"
          : "under_review"
        : "pending",
    backgroundCheck: profStatus === "approved" ? "verified" : "pending",
  };
  const done = Object.values(steps).filter((s) => s === "completed" || s === "verified").length;
  const overallProgress = Math.round((done / 4) * 100);
  const est = new Date();
  est.setDate(est.getDate() + (appStatus === "approved" ? 0 : 2));
  return {
    steps,
    overallProgress,
    estimatedCompletionDate: est.toISOString(),
    applicationStatus: appStatus,
    profileStatus: profStatus,
  };
}
