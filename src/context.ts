import * as image from "./image.ts";
import { infinityRange, range, type RangeOptions, throwIfNaInt } from "./utils.ts";

export interface Command {
  run(args: string[]): void;
}

interface ContextRangeOptions extends RangeOptions {
  axis: string;
}

class RangeCommand implements Command {
  #factory: ContextFactory;

  constructor(factory: ContextFactory) {
    this.#factory = factory;
  }

  run(args: string[]): void {
    if (args.length !== 4) {
      throw new Error("Expected 4 args to the range command");
    }
    const [axis] = args;
    const [start, end, step] = args.slice(1)
      .map((a) => throwIfNaInt(a));
    this.#factory.setRange({
      axis,
      start,
      end,
      step,
    });
  }
}

class ImgCommand implements Command {
  #factory: ContextFactory;

  constructor(factory: ContextFactory) {
    this.#factory = factory;
  }

  run(args: string[]): void {
    if (args.length < 2) {
      throw new Error("Expected at least 2 args to the img command");
    }
    const [name] = args;
    this.#factory.setImg(name, args.slice(1).join(""));
  }
}

class MiffCommand implements Command {
  #factory: ContextFactory;

  constructor(factory: ContextFactory) {
    this.#factory = factory;
  }

  run(args: string[]): void {
    this.#factory.miff = args.join("");
  }
}

interface ContextOptions {
  imgs: Map<string, image.MagickImage>;
  ranges: ContextRangeOptions[];
  current: image.MagickImage | null;
}

interface AxisRange {
  axis: string;
  gen: Generator<number, void, unknown>;
  options: RangeOptions;
}

export class Context {
  #imgs: Map<string, image.MagickImage>;

  #ranges: ContextRangeOptions[];

  #current: image.MagickImage | null;

  constructor({ imgs, ranges, current }: ContextOptions) {
    this.#imgs = imgs;
    this.#ranges = ranges;
    this.#current = current;
  }

  getImg(name: string): image.MagickImage {
    const img = this.#imgs.get(name);
    if (img === undefined) {
      throw new Error(`Unknown img: '${name}'`);
    }
    return img;
  }

  async *[Symbol.asyncIterator]() {
    yield* this.#axis({}, this.#ranges);
  }

  *#axis(current: Record<string, number>, ranges: ContextRangeOptions[]) {
    const [root] = ranges;
    if (root === undefined) {
      yield { ...current };
      return;
    }
    for (const value of range(root)) {
      current[root.axis] = value;
      yield* this.#axis(current, ranges.slice(1));
    }
  }
}

export class ContextFactory {
  #imgs: Map<string, string>;

  #ranges: Map<string, ContextRangeOptions>;

  #commands: Record<string, Command>;

  #miff: string | null;

  set miff(value: string | null) {
    this.#miff = value ? value : null;
  }

  constructor() {
    this.#imgs = new Map();
    this.#ranges = new Map();
    this.#commands = {
      range: new RangeCommand(this),
      img: new ImgCommand(this),
      miff: new MiffCommand(this),
    };
    this.#miff = null;
  }

  setRange(range: ContextRangeOptions): this {
    this.#ranges.set(range.axis, range);
    return this;
  }

  setImg(name: string, pathname: string): this {
    this.#imgs.set(name, pathname);
    return this;
  }

  run(args: string[]): void {
    const [command] = args;
    const c = this.#commands[command];
    if (c === undefined) {
      //throw new Error(`Invalid command: ${command}`);
      return;
    }
    c.run(args.slice(1));
  }

  build(): Context {
    const imgs: Map<string, image.MagickImage> = new Map();
    for (const [name, pathname] of this.#imgs) {
      imgs.set(name, image.fromFile(pathname));
    }
    return new Context({
      imgs,
      ranges: Array.from(this.#ranges.values()),
      current: this.#miff !== null ? image.fromFile(this.#miff) : null,
    });
  }
}
