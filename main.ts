function* matchs(
  re: RegExp,
  content: string,
): Generator<RegExpMatchArray, void, unknown> {
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    yield match;
  }
}

async function* asyncMatchs(
  re: RegExp,
  readable: ReadableStream<string>,
): AsyncGenerator<RegExpMatchArray, void, unknown> {
  for await (const chunck of readable) {
    yield* matchs(re, chunck);
  }
}

async function readVars(
  lines: ReadableStream<string>,
): Promise<Map<string, string>> {
  const re = /^([A-Za-z]\w*)\="(.+)"\s*$/gm;
  const vars = new Map<string, string>();
  for await (const [, name, value] of asyncMatchs(re, lines)) {
    vars.set(name, value);
  }
  return vars;
}

interface RangeOptions {
  start: number;
  end: number;
  step: number;
}

interface PrepareLoopResult {
  x: RangeOptions;
  y: RangeOptions;
}

async function prepareLoop(
  lines: ReadableStream<string>,
): Promise<PrepareLoopResult> {
  const re = /^range(x|y)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/gm;
  const result: Record<string, RangeOptions> = {};
  for await (const [, axis, start, end, step] of asyncMatchs(re, lines)) {
    result[axis] = {
      start: parseInt(start),
      end: parseInt(end),
      step: parseInt(step),
    };
  }
  return {
    x: result.x,
    y: result.y,
  };
}

async function main([infile]: string[]): Promise<number> {
  const readable = (infile !== undefined ? Deno.openSync(infile) : Deno.stdin)
    .readable
    .pipeThrough(new TextDecoderStream());
  const vars = new Map<string, string>();
  const ranges = new Map<string, RangeOptions>();
  const re = /^([a-z]+)\s*/gm
  const methods: Record<string, (line: string) => unknown> = {
    var(line) {
      const re = /^([A-Za-z]\w*)\="(.+)"\s*$/;
      const match = re.exec(line);
      if (match === null) {
        return;
      }
      vars.set(match[1], match[2]);
    }
  }
  let command: string | undefined;
  let index = 0;
  for await (const match of asyncMatchs(re, readable)) {
    if (command === undefined) {
      [,command] = match;
      index = (match.index as number) + match[0].length;
      continue;
    }
    const m = methods[command];
    if (m !== undefined) {
      m((match.input as string).substring(index, match.index));
    }
    console.log(command, (match.input as string).substring(index, match.index));
    index = (match.index as number) + match[0].length;
    [,command] = match;
  }
  console.log(vars);
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
