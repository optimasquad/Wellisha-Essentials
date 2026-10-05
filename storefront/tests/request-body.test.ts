import test from "node:test";
import assert from "node:assert/strict";
import { MAX_COMMERCE_BODY_BYTES, readCommerceBody, RequestBodyError } from "../lib/request-body";

function streamed(chunks: Uint8Array[], cancelled?: () => void) {
  return new Request("https://wellisha.example/api/commerce/me/addresses", {
    method: "POST",
    body: new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel: cancelled,
    }),
    duplex: "half",
  } as RequestInit);
}

test("body at the byte limit is preserved without a declared length", async () => {
  const body = "a".repeat(MAX_COMMERCE_BODY_BYTES);
  assert.equal(await readCommerceBody(streamed([new TextEncoder().encode(body)])), body);
});

test("oversized stream is cancelled before remaining chunks are consumed", async () => {
  let cancelled = false;
  const chunks = Array.from({ length: 20 }, () => new Uint8Array(4096));
  await assert.rejects(readCommerceBody(streamed(chunks, () => { cancelled = true; })),
    (error: unknown) => error instanceof RequestBodyError && error.status === 413);
  assert.equal(cancelled, true);
  assert.ok(chunks.length > 10);
});

test("declared oversized body is rejected without reading it", async () => {
  const request = new Request("https://wellisha.example", {
    method: "POST", body: "small", headers: { "Content-Length": String(MAX_COMMERCE_BODY_BYTES + 1) },
  });
  await assert.rejects(readCommerceBody(request), { status: 413 });
  assert.equal(request.bodyUsed, false);
});

test("multibyte UTF-8 is decoded across chunk boundaries and limited in bytes", async () => {
  const bytes = new TextEncoder().encode("\u20ac");
  assert.equal(await readCommerceBody(streamed([bytes.slice(0, 1), bytes.slice(1)])), "\u20ac");
  await assert.rejects(readCommerceBody(streamed([new TextEncoder().encode("\u20ac".repeat(6000))])), { status: 413 });
});

test("compressed payloads are rejected before decoding", async () => {
  const request = new Request("https://wellisha.example", {
    method: "POST", body: "compressed", headers: { "Content-Encoding": "gzip" },
  });
  await assert.rejects(readCommerceBody(request), { status: 415 });
  assert.equal(request.bodyUsed, false);
});

test("bodyless mutations are supported", async () => {
  assert.equal(await readCommerceBody(new Request("https://wellisha.example", { method: "PATCH" })), undefined);
});
