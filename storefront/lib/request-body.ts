export const MAX_COMMERCE_BODY_BYTES = 16 * 1024;

export class RequestBodyError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

/** Limit streamed bytes before decoding, even when Content-Length is missing. */
export async function readCommerceBody(request: Request): Promise<string | undefined> {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_COMMERCE_BODY_BYTES) {
    throw new RequestBodyError(413, "REQUEST_BODY_TOO_LARGE");
  }
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding.trim().toLowerCase() !== "identity") {
    throw new RequestBodyError(415, "UNSUPPORTED_CONTENT_ENCODING");
  }
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_COMMERCE_BODY_BYTES) {
        throw new RequestBodyError(413, "REQUEST_BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(body);
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}
