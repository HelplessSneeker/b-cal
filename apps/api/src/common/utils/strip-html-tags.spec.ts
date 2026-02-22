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

  it('should strip malformed tags without closing >', () => {
    expect(stripHtmlTags('<img src=x onerror=alert(1)')).toBe('');
  });

  it('should strip malformed script tag without closing >', () => {
    expect(stripHtmlTags('text<script src=evil.js')).toBe('text');
  });

  it('should not strip angle brackets in non-tag contexts', () => {
    expect(stripHtmlTags('a < b')).toBe('a < b');
    expect(stripHtmlTags('3 < 5 > 2')).toBe('3 < 5 > 2');
  });

  it('should strip HTML comments', () => {
    expect(stripHtmlTags('before<!-- comment -->after')).toBe('beforeafter');
  });

  // XSS bypass probes
  it('should handle nested tag evasion attempts', () => {
    expect(stripHtmlTags('<scr<script>ipt>alert(1)</scr</script>ipt>')).toBe(
      'ipt>alert(1)ipt>',
    );
  });

  it('should handle SVG/event handler payloads', () => {
    expect(stripHtmlTags('<svg onload=alert(1)>')).toBe('');
    expect(stripHtmlTags('<svg/onload=alert(1)>')).toBe('');
  });

  it('should handle tags with backtick attributes', () => {
    expect(stripHtmlTags('<img src=`x` onerror=alert(1)>')).toBe('');
  });

  it('should handle double-open angle bracket via multi-pass', () => {
    expect(stripHtmlTags('<<script>alert(1)</script>')).toBe('');
  });

  it('should strip null bytes and handle tag', () => {
    expect(stripHtmlTags('<scri\x00pt>alert(1)</script>')).toBe('alert(1)');
  });

  it('should handle mixed case tags', () => {
    expect(stripHtmlTags('<ScRiPt>alert(1)</ScRiPt>')).toBe('alert(1)');
  });

  it('should handle javascript: URI in attribute', () => {
    expect(stripHtmlTags('<a href="javascript:alert(1)">click</a>')).toBe(
      'click',
    );
  });

  it('should handle tag with newline in name', () => {
    expect(stripHtmlTags('<img\nsrc=x\nonerror=alert(1)>')).toBe('');
  });
});
