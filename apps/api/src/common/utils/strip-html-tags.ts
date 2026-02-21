export function stripHtmlTags(value: string): string {
  const re = /<\/?[a-zA-Z!][^>]*>?/g;
  let result = value.replace(/\0/g, '');
  let prev;
  do {
    prev = result;
    result = result.replace(re, '');
  } while (result !== prev);
  return result;
}
