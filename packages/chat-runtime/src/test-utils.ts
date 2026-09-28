/** A byte stream that delivers exactly the given chunks, in order. */
export function streamOf(
  chunks: (string | Uint8Array<ArrayBuffer>)[],
): ReadableStream<Uint8Array<ArrayBuffer>> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
      }
      controller.close();
    },
  });
}
