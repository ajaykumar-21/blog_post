export function slugify(value) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 220); }
export function uniqueSlug(title) { return `${slugify(title) || 'post'}-${Date.now().toString(36)}`; }
