// The body of an API answer, for the forms. The app's own errors are JSON with { error }; when the
// Vercel Firewall stops a burst from one network (README, "Rate limits") the answer is a 429 page
// with no JSON, so the guest still gets a sentence instead of a parse error.
export async function replyOf(res: Response): Promise<any> {
  const j = (await res.json().catch(() => null)) ?? {};
  if (!res.ok && !j.error && res.status === 429) j.error = "Too many requests from this network. Wait a minute and try again.";
  return j;
}
