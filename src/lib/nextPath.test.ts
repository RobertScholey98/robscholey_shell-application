import { describe, it, expect } from 'vitest';
import { parseSafeNextPath } from './nextPath';

const APPS = new Set(['admin', 'portfolio', 'template-child-nextjs']);

describe('parseSafeNextPath', () => {
  it('returns null when nextPath is absent', () => {
    expect(parseSafeNextPath(null, APPS)).toBeNull();
  });

  it('returns null when nextPath is empty', () => {
    expect(parseSafeNextPath('', APPS)).toBeNull();
  });

  it('passes through a valid single-segment slug', () => {
    expect(parseSafeNextPath('/portfolio', APPS)).toBe('/portfolio');
  });

  it('passes through a valid slug with sub-path', () => {
    expect(parseSafeNextPath('/admin/users/42', APPS)).toBe('/admin/users/42');
  });

  it('passes through a slug with dashes and digits', () => {
    expect(parseSafeNextPath('/template-child-nextjs', APPS)).toBe(
      '/template-child-nextjs',
    );
  });

  it('rejects absolute URLs', () => {
    expect(parseSafeNextPath('https://evil.com/portfolio', APPS)).toBeNull();
    expect(parseSafeNextPath('http://evil.com', APPS)).toBeNull();
  });

  it('rejects protocol-relative URLs', () => {
    expect(parseSafeNextPath('//evil.com/portfolio', APPS)).toBeNull();
    expect(parseSafeNextPath('//evil.com', APPS)).toBeNull();
  });

  it('rejects backslash tricks', () => {
    expect(parseSafeNextPath('/\\evil.com', APPS)).toBeNull();
  });

  it('rejects javascript: and data: URIs', () => {
    expect(parseSafeNextPath('javascript:alert(1)', APPS)).toBeNull();
    expect(parseSafeNextPath('data:text/html,<script>', APPS)).toBeNull();
  });

  it('rejects paths that do not start with a slug', () => {
    expect(parseSafeNextPath('/', APPS)).toBeNull();
    expect(parseSafeNextPath('/../escape', APPS)).toBeNull();
    expect(parseSafeNextPath('/.hidden', APPS)).toBeNull();
  });

  it('rejects uppercase / non-slug chars in the leading segment', () => {
    expect(parseSafeNextPath('/Admin', APPS)).toBeNull();
    expect(parseSafeNextPath('/admin_panel', APPS)).toBeNull();
    expect(parseSafeNextPath('/admin.json', APPS)).toBeNull();
  });

  it('rejects slugs that start with a digit', () => {
    expect(parseSafeNextPath('/1admin', APPS)).toBeNull();
  });

  it('rejects slugs not in the session apps list', () => {
    expect(parseSafeNextPath('/secretapp', APPS)).toBeNull();
    expect(parseSafeNextPath('/secretapp/deep-path', APPS)).toBeNull();
  });

  it('treats the empty session apps set as denying everything', () => {
    expect(parseSafeNextPath('/portfolio', new Set())).toBeNull();
  });
});
