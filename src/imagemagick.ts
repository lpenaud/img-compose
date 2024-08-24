import * as image from "./image.ts";

function imagemagick({ args }: { args: string[] }) {
  const command = new Deno.Command("magick", {
    args,
    stderr: "piped",
    stdout: "piped",
    stdin: "piped",
  });
  console.log(args);
  return command.spawn();
}

async function handleError(
  process: Deno.ChildProcess,
): Promise<Deno.CommandOutput> {
  const output = await process.output();
  if (output.success) {
    return output;
  }
  console.error(new TextDecoder().decode(output.stderr));
  throw new Error(`Composite error ${output.code}`);
}

async function writeImages(
  process: Deno.ChildProcess,
  imgs: image.MagickImage[],
): Promise<void> {
  const writer = process.stdin.getWriter();
  for (const { content } of imgs) {
    await writer.write(content);
  }
  await writer.close();
}

export interface CompositeOptions {
  heigth: number;
  width: number;
  x: number;
  y: number;
  imgs: image.MagickImage[];
  outputType: string;
}

export async function composite(
  { heigth, width, x, y, imgs, outputType }: CompositeOptions,
): Promise<image.MagickImage> {
  const process = imagemagick({
    args: [
      "composite",
      "-geometry",
      `${heigth}x${width}+${x}+${y}`,
      ...imgs.map(({ name }) => name),
      `${outputType}:-`,
    ],
  });
  await writeImages(process, imgs);
  const output = await handleError(process);
  return image.fromBuffer(outputType, output.stdout);
}

export interface ConvertOptions {
  infile: image.MagickImage;
  outfile: image.MagickImage;
}

export async function convert(
  { infile, outfile }: ConvertOptions,
): Promise<void> {
  const process = imagemagick({
    args: [infile.name, outfile.name],
  });
  await writeImages(process, [infile]);
  await handleError(process);
}
