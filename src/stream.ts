const RE_LINE = /^([a-z]+)\s*(.*)$/gm;

export class TransformScriptStream
  extends TransformStream<string, [string, string]> {
  constructor() {
    super({
      transform(chunk, controller) {
        let match: RegExpExecArray | null;
        while ((match = RE_LINE.exec(chunk)) !== null) {
          const [, command, args] = match;
          controller.enqueue([command, args]);
        }
      },
    });
  }
}

export async function* readByob(
  readable: ReadableStream<Uint8Array>,
  byteLength: number = 2E6,
): AsyncGenerator<Uint8Array, void, unknown> {
  const reader = readable.getReader({ mode: "byob" });
  let buffer = new ArrayBuffer(byteLength);
  let it: ReadableStreamReadResult<Uint8Array>;
  while (!(it = await reader.read(new Uint8Array(buffer))).done) {
    yield it.value;
    buffer = it.value.buffer;
  }
}

export async function readAll(
  readable: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  let byteLength: number = 0;
  const buffers: Uint8Array[] = [];
  for await (const buffer of readByob(readable)) {
    buffers.push(buffer.slice());
    byteLength += buffer.byteLength;
  }
  const concat = new Uint8Array(byteLength);
  let i = 0;
  for (const buffer of buffers) {
    concat.set(buffer, i);
    i += buffer.byteLength;
  }
  return concat;
}
