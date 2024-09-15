import * as image from "./image.ts";
import {
  range,
  type RangeOptions,
  throwIfNaInt,
} from "./utils.ts";

export interface FactoryCommand {
  init(factory: ContextFactory, args: string[]): void;
}

export interface Command {
  run(ctx: Context): void;
}

interface ContextRangeOptions extends RangeOptions {
  axis: string;
}

class RangeCommand implements FactoryCommand {
  init(factory: ContextFactory, args: string[]): void {
    if (args.length !== 4) {
      throw new Error("Expected 4 args to the range command");
    }
    const [axis] = args;
    const [start, end, step] = args.slice(1)
      .map((a) => throwIfNaInt(a));
    factory.setRange({
      axis,
      start,
      end,
      step,
    });
  }
}

class ImgCommand implements FactoryCommand {
  init(factory: ContextFactory, args: string[]): void {
    if (args.length < 2) {
      throw new Error("Expected at least 2 args to the img command");
    }
    const [name] = args;
    factory.setImg(name, args.slice(1).join(""));
  }
}

class MiffCommand implements Command {

  #name: string;

  constructor (name: string) {
    this.#name = name;
  }

  run(ctx: Context): void {
    ctx.current = image.fromFile(this.#name);
  }
  
}

class MiffFactoryCommand implements FactoryCommand {

  init(factory: ContextFactory, args: string[]): void {
    const [name] = args;
    if (name === undefined) {
      throw new Error("Expected one arg to the miff command");
    }
    factory.pushCommand(new MiffCommand(name));
  }
}

interface ContextOptions {
  imgs: Map<string, image.MagickImage>;
  ranges: ContextRanges;
}

interface ContextRangeValueOptions {
  axis: string;
  options: RangeOptions;
  gen: Generator<number, void, unknown>;
  current: IteratorResult<number, void>;
}

class ContextRanges {
  #values: ContextRangeValueOptions[];

  constructor(...ranges: ContextRangeOptions[]) {
    this.#values = ranges.map((r) => {
      const options = Object.freeze({
        end: r.end,
        start: r.start,
        step: r.step,
      });
      const gen = range(options);
      return {
        axis: r.axis,
        gen,
        options,
        current: gen.next(),
      };
    });
  }

  *[Symbol.iterator](): Iterator<Map<string, number>, void> {
    const [root] = this.#values;
    if (root.current.done) {
      return;
    }
    let i: number;
    for (i = this.#values.length - 1; i > 0; i--) {
      const current = this.#values[i];
      current.current = current.gen.next();
      if (current.current.done) {
        current.gen = range(current.options);
        current.current = current.gen.next();
        continue;
      }
      break;
    }
    if (i === 0) {
      root.current = root.gen.next();
      if (root.current.done) {
        return;
      }
    }
    yield this.#values.reduce((m, r) => m.set(r.axis, r.current.value as number), new Map<string, number>());
  }
}

export class Context {
  #imgs: Map<string, image.MagickImage>;

  #ranges: Iterator<Map<string, number>, void>;

  current: image.MagickImage | null;

  get range(): IteratorResult<Map<string, number>, void> {
    return this.#ranges.next();
  }

  constructor({ imgs, ranges }: ContextOptions) {
    this.#imgs = imgs;
    this.#ranges = ranges[Symbol.iterator]();
    this.current = null;
  }

  getImg(name: string): image.MagickImage {
    const img = this.#imgs.get(name);
    if (img === undefined) {
      throw new Error(`Unknown img: '${name}'`);
    }
    return img;
  }
}

export class ContextFactory {
  #imgs: Map<string, string>;

  #ranges: Map<string, ContextRangeOptions>;

  #commands: Record<string, FactoryCommand>;

  #contextCommand: Command[];

  #miff: string | null;

  set miff(value: string | null) {
    this.#miff = value ? value : null;
  }

  constructor() {
    this.#imgs = new Map();
    this.#ranges = new Map();
    this.#commands = {
      range: new RangeCommand(),
      img: new ImgCommand(),
      miff: new MiffFactoryCommand(),
    };
    this.#miff = null;
    this.#contextCommand = [];
  }

  setRange(range: ContextRangeOptions): this {
    this.#ranges.set(range.axis, range);
    return this;
  }

  setImg(name: string, pathname: string): this {
    this.#imgs.set(name, pathname);
    return this;
  }

  pushCommand(c: Command) {
    this.#contextCommand.push(c);
  }

  run(args: string[]): void {
    const [command] = args;
    const c = this.#commands[command];
    if (c === undefined) {
      //throw new Error(`Invalid command: ${command}`);
      return;
    }
    c.init(this, args.slice(1));
  }

  build(): Context {
    const imgs: Map<string, image.MagickImage> = new Map();
    for (const [name, pathname] of this.#imgs) {
      imgs.set(name, image.fromFile(pathname));
    }
    return new Context({
      imgs,
      ranges: new ContextRanges(...this.#ranges.values()),
    });
  }
}
