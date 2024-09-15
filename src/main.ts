import * as magick from "./imagemagick.ts";
import * as image from "./image.ts";
import * as script from "./script.ts";



async function main([infile]: string[]): Promise<number> {
  const context = await (infile === undefined
    ? script.fromReadable(Deno.stdin.readable)
    : script.fromFile(infile)
  );
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
