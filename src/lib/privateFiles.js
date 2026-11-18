import { base44 } from "@/api/base44Client";

// Receipts/proofs are stored privately. The record keeps the private file
// reference; a short-lived link is created only when someone opens it.
// Old records still hold public http(s) links — those are used as-is.

export async function uploadPrivateReceipt(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}

export const isPublicLink = (ref) => /^https?:\/\//i.test(ref || "");

export async function resolveFileLink(ref, expiresIn = 600) {
  if (!ref) return "";
  if (isPublicLink(ref)) return ref;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: ref, expires_in: expiresIn });
  return signed_url;
}

// Spread onto an <a> in place of href: {...fileLinkProps(record.receipt_url)}
export const fileLinkProps = (ref) => ({
  href: "#",
  onClick: (e) => { e.preventDefault(); openFile(ref); },
});

export async function openFile(ref) {
  // Open the tab synchronously so pop-up blockers don't stop it.
  const win = window.open("", "_blank");
  const url = await resolveFileLink(ref);
  if (win) win.location.href = url;
  else window.location.href = url;
}