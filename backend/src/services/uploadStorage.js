/**
 * Upload backend: local disk (default, permanent on your server).
 */

export function resolveUploadStorageMode() {
  return "local";
}

export function useLocalFileStorage() {
  return true;
}

export function describeFileStorage() {
  return "local-disk";
}
