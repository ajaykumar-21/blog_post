import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCredentials, validatePost } from '../src/utils/validation.js';
import { slugify } from '../src/utils/slug.js';

test('post validation accepts a normal post and rejects excess tags', () => {
  assert.equal(validatePost({ title: 'A title', content: 'A body', tags: ['nextjs'] }), null);
  assert.equal(validatePost({ title: 'A title', content: 'A body', tags: ['1', '2', '3', '4', '5', '6'] }), 'Use up to five non-empty tags.');
});

test('credential validation requires an email and secure-length password', () => {
  assert.equal(validateCredentials({ email: 'user@example.com', password: 'password123' }), null);
  assert.equal(validateCredentials({ email: 'not-an-email', password: 'password123' }), 'Enter a valid email address.');
});

test('slugify produces URL-safe strings', () => {
  assert.equal(slugify('Hello, Scalable Blog!'), 'hello-scalable-blog');
});
