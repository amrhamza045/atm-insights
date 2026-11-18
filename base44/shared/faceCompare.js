/** Server-side face match: live capture vs the stored reference photo. */
async function toUrl(integrations, value, name) {
  if (!String(value).startsWith('data:')) return value;
  const [head, b64] = value.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const file = new File([bytes], name, { type: mime });
  const { file_uri } = await integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 300 });
  return signed_url;
}

export async function compareFaces(integrations, capturedDataUrl, storedFace) {
  const capturedUrl = await toUrl(integrations, capturedDataUrl, 'captured_face.jpg');
  const storedUrl = await toUrl(integrations, storedFace, 'stored_face.jpg');
  const res = await integrations.Core.InvokeLLM({
    prompt: "You are a face recognition system. You are given two face photos. The FIRST image is a freshly captured photo from a camera. The SECOND image is the registered reference photo. Determine whether they show the SAME PERSON by comparing facial features: eyes, eyebrows, nose, mouth, jawline, ear shape, and any distinguishing features. Be lenient with lighting, angle, and expression differences. Respond with is_same_person (true/false) and confidence (0-100).",
    file_urls: [capturedUrl, storedUrl],
    response_json_schema: { type: 'object', properties: { is_same_person: { type: 'boolean' }, confidence: { type: 'number' } } },
  });
  const v = res?.is_same_person;
  return { match: v === true || String(v).toLowerCase() === 'true' || v === 1, confidence: Math.round(Number(res?.confidence) || 0) };
}