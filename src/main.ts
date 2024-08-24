import { ContextFactory } from "./context.ts";
import { TransformScriptStream } from "./stream.ts";
import * as magick from "./imagemagick.ts";
import * as image from "./image.ts";

async function fromFile(pathname: string) {
  const file = await Deno.open(pathname);
  return fromReadable(file.readable);
}

async function fromReadable(readable: ReadableStream<Uint8Array>) {
  const lines = readable.pipeThrough(new TextDecoderStream())
    .pipeThrough(new TransformScriptStream());
  const factory = new ContextFactory();
  for await (const [command, args] of lines) {
    factory.run(command, args);
  }
  return factory.build();
}

function fromFileOrStdin(infile: string | undefined) {
  if (infile === undefined) {
    return fromReadable(Deno.stdin.readable);
  }
  return fromFile(infile);
}

async function main([infile]: string[]): Promise<number> {
  const context = await fromFileOrStdin(infile);
  const picture = image.fromFile(context.getVar("PICTURE"));
  let background = image.fromFile(context.getVar("BACKGROUND"));
  for (const [x, y] of context) {
    background = await magick.composite({
      heigth: 60,
      width: 60,
      x,
      y,
      imgs: [picture, background],
      outputType: "miff",
    });
  }
  await magick.convert({
    infile: background,
    outfile: image.fromFile("output.png"),
  });
  return 0;
}

if (import.meta.main) {
  main(Deno.args.slice())
    .then(Deno.exit)
    .catch((err) => {
      console.error(err);
      Deno.exit(2);
    });
}
