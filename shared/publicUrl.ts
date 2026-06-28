/** True for localhost, loopback, or private LAN IPs used in local dev. */
export function isLocalDevHost(domain: string): boolean {
  const hostname = domain.split(":")[0].toLowerCase();

  if (hostname === "localhost" || hostname.startsWith("127.")) {
    return true;
  }

  if (hostname.startsWith("10.")) return true;
  if (hostname.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;

  return false;
}

/** Build the public API / web base URL from EXPO_PUBLIC_DOMAIN (no trailing slash). */
export function getPublicBaseUrl(domain = process.env.EXPO_PUBLIC_DOMAIN): string {
  if (!domain) {
    return "http://localhost:5000";
  }

  const protocol = isLocalDevHost(domain) ? "http" : "https";
  return `${protocol}://${domain}`;
}
