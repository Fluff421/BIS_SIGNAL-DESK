/** Migration file name filter used by db bootstrap and migrate script. */
export function isMigrationFile(name) {
  return /^\d{4}_.*\.(sql|mjs|js|ts)$/.test(name);
}
