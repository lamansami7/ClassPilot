/** Cap actual bytes before parsing, including requests without Content-Length. */
export async function boundedBody(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max) return null;
  const reader = request.body?.getReader();
  if (!reader) return new Blob();
  const chunks: ArrayBuffer[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        return null;
      }
      chunks.push(value.slice().buffer);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks, {
    type: request.headers.get("content-type") || "application/octet-stream",
  });
}
