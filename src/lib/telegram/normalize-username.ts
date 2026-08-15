/**
 * Accepts a bare username ("my_channel"), an "@handle", or a pasted
 * t.me/telegram.me link ("https://t.me/my_channel", "t.me/my_channel/123")
 * and returns just the bare username GramJS's ResolveUsername expects.
 * Returns null for private invite links (t.me/+...), which aren't resolvable
 * by username at all.
 */
export function normalizeTelegramUsername(input: string): string | null {
  let value = input.trim();
  if (!value) return null;

  const linkMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/(.+)$/i);
  if (linkMatch) {
    value = linkMatch[1];
  }

  value = value.replace(/^@/, "");
  value = value.split(/[/?#]/)[0];

  if (!value || value.startsWith("+") || value.startsWith("joinchat")) return null;

  return value;
}
