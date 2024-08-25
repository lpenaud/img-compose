import { Context, ContextFactory } from "./context.ts";

const START_LINE = /^[a-z]+/gm;
const SEPARATOR = /\s+/;

interface TransformScriptChunk {
  line: number;
  args: string[];
}

class TransformScriptStream
  extends TransformStream<string, TransformScriptChunk> {
  #line: number;

  constructor() {
    super({
      transform: (chunk, controller) => {
        let match: RegExpExecArray | null;
        while ((match = START_LINE.exec(chunk)) !== null) {
          this.#line++;
          const { input, index } = match;
          const [command] = match;
          const i = input.indexOf("\n", index + command.length);
          const args = input.substring(index, i === -1 ? input.length : i)
            .split(SEPARATOR);
          controller.enqueue({
            line: this.#line,
            args,
          });
        }
      },
    });
    this.#line = 0;
  }
}

export async function fromReadable(readable: ReadableStream<Uint8Array>): Promise<Context> {
  const lines = readable.pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformScriptStream());
  const factory = new ContextFactory();
  for await (const { args, line } of lines) {
    try {
      factory.run(args);
    } catch (error) {
      throw new Error(`Unexpected error at line: ${line}`, {
        cause: error,
      });
    }
  }
  return factory.build();
}

export async function fromFile(pathname: string): Promise<Context> {
  const file = await Deno.open(pathname);
  return fromReadable(file.readable);
}
