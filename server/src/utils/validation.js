export function text(value, maxLength) { return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength; }
export function validatePost({ title, content, tags = [] }) {
  if (!text(title, 200) || !text(content, 10000)) return 'Title and content are required.';
  if (!Array.isArray(tags) || tags.length > 5 || tags.some((tag) => !text(tag, 50))) return 'Use up to five non-empty tags.';
  return null;
}
export function validateComment({ content }) { return text(content, 2000) ? null : 'Comment content is required.'; }
export function validateCredentials({ name, email, password }, isRegistration = false) {
  if (!text(email, 255) || !/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.';
  if (!text(password, 128) || password.length < 8) return 'Password must contain at least 8 characters.';
  if (isRegistration && !text(name, 100)) return 'Name is required.';
  return null;
}
