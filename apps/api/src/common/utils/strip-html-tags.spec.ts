import { stripHtmlTags } from './strip-html-tags';

describe('stripHtmlTags', () => {
  it('should remove simple HTML tags', () => {
    expect(stripHtmlTags('<b>bold</b>')).toBe('bold');
  });

  it('should remove tags with attributes', () => {
    expect(stripHtmlTags('<a href="http://example.com">link</a>')).toBe('link');
  });

  it('should remove self-closing tags', () => {
    expect(stripHtmlTags('text<br/>more')).toBe('textmore');
  });

  it('should remove script tags and their content markers', () => {
    expect(stripHtmlTags('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('should handle multiple tags', () => {
    expect(stripHtmlTags('<p>Hello</p> <b>World</b>')).toBe('Hello World');
  });

  it('should return plain text unchanged', () => {
    expect(stripHtmlTags('no tags here')).toBe('no tags here');
  });

  it('should return empty string for empty input', () => {
    expect(stripHtmlTags('')).toBe('');
  });

  it('should handle nested tags', () => {
    expect(stripHtmlTags('<div><span>nested</span></div>')).toBe('nested');
  });

  it('should preserve text between tags', () => {
    expect(stripHtmlTags('before<em>middle</em>after')).toBe(
      'beforemiddleafter',
    );
  });
});
