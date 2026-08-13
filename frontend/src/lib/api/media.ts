/**
 * Where a photograph is fetched from.
 *
 * By row id, not by object key. The key is a detail of the object store and no
 * caller should be able to name one: the API looks the row up and reads the key
 * off it, so a browser can only ask for photographs that exist as rows, and
 * there is no shape of URL that could address anything else in the bucket.
 *
 * Safe to import from a client component: it builds a string and nothing more.
 */

export function imageSrc(id: number): string {
  return `/media/${id}`;
}
