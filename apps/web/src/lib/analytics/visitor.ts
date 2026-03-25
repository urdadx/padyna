const VISITOR_COOKIE_NAME = "padyna_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getVisitorId(): string {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === VISITOR_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return "";
}

export function setVisitorId(visitorId: string): void {
  const domain = window.location.hostname;
  document.cookie = `${VISITOR_COOKIE_NAME}=${encodeURIComponent(
    visitorId,
  )};max-age=${COOKIE_MAX_AGE};path=/;SameSite=Lax${domain !== "localhost" ? `;domain=.${domain}` : ""}`;
}

export function getOrCreateVisitorId(): string {
  let visitorId = getVisitorId();
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    setVisitorId(visitorId);
  }
  return visitorId;
}
