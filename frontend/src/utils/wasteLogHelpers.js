export function getEstimatedKg(log) {
  return Number(
    log?.estimated_kg ??
    log?.estimatedKg ??
    log?.logged_kg ??
    log?.loggedKg ??
    log?.quantity_kg ??
    log?.quantity ??
    log?.weight ??
    0
  );
}

export function getVerifiedKg(log) {
  return Number(
    log?.verified_kg ??
    log?.verifiedKg ??
    0
  );
}

export function hasVerifiedKg(log) {
  const value = log?.verified_kg ?? log?.verifiedKg;
  return value !== null && value !== undefined && Number(value) > 0;
}