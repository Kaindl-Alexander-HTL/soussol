// ADMIN_EMAIL is the main admin, ADMIN_EMAILS (comma-separated) adds further
// admins. Every address gets backoffice access and the admin notifications.
export function adminEmails(main: string | undefined, extra: string | undefined): string[] {
  const all = [main ?? '', extra ?? '']
    .join(',')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(all)]
}
