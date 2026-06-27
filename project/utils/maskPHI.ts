export function maskSAID(id: string): string {
  if (!id || id.length !== 13) return id;
  return `${id.substring(0, 4)}****${id.substring(8)}`;
}

export function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 10) return mobile;
  return `${mobile.substring(0, 3)}*****${mobile.substring(mobile.length - 4)}`;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}*****${local[local.length - 1]}@${domain}`;
}
