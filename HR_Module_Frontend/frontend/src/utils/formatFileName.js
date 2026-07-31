const GMAIL_ID_PREFIX = /^[0-9a-f]{10,}[-_]/i;

export function stripFileNameId(fileName) {
  if (!fileName) return fileName;
  return fileName.replace(GMAIL_ID_PREFIX, "");
}
