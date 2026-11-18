/** Random, hard-to-guess token used as the guest's RSVP credential. */
export function generateInvitationToken() {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${rand()}${rand()}`;
}

/** Origin of the live (published) app — guest links must never point at the preview environment. */
function publicOrigin() {
  return window.location.origin.replace("//preview--", "//");
}

/** Public link a guest opens to RSVP. */
export function invitationLink(token) {
  return `${publicOrigin()}/EventRsvp?t=${token}`;
}

/** Premium attendance-confirmation link (entry pass with QR code). */
export function passLink(token) {
  return `${publicOrigin()}/EventPass?t=${token}`;
}