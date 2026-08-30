/**
 * A Blob's text, in jsdom.
 *
 * `Blob.prototype.text` is as absent from jsdom as `arrayBuffer` is (see
 * the note at the top of `bytes.ts`), and every test in this folder reads
 * its own output back — which is the whole point of them. `bytesOf`
 * already knows how to get bytes out of a Blob in both environments, so
 * this is one decode on top of it rather than a second workaround.
 */
import { bytesOf } from '../bytes';

export async function textOf(blob: Blob): Promise<string> {
  return new TextDecoder().decode(await bytesOf(blob));
}

export async function jsonOf<T = unknown>(blob: Blob): Promise<T> {
  return JSON.parse(await textOf(blob)) as T;
}
