import { range, type RangeOptions } from "./utils.ts";

export interface Command {
  run(args: string): void;
}

const VAR_RE = /^([A-Za-z]\w*)\="(.+)"\s*$/;
const RANGE_RE = /\s+/;

interface SplitArgsOptions {
  length: number;
}

function splitArgs(args: string, length: number): string[] {
  const result = args.split(RANGE_RE, length);
  if (result.length < length) {
    throw new Error(`Expected ${length} args`);
  }
  return result;
}

class VarCommand implements Command {
  #factory: ContextFactory;

  constructor(factory: ContextFactory) {
    this.#factory = factory;
  }

  run(args: string): void {
    const match = VAR_RE.exec(args);
    if (match === null) {
      return;
    }
    const [, name, value] = match;
    this.#factory.setVar(name, value);
  }
}

class RangeCommand implements Command {
  #factory: ContextFactory;

  constructor(factory: ContextFactory) {
    this.#factory = factory;
  }

  run(args: string): void {
    const [axis, start, end, step] = this.#split(args);
    this.#factory.setRange(axis, {
      start: parseInt(start),
      end: parseInt(end),
      step: parseInt(step),
    });
  }

  #split(args: string) {
    try {
      return splitArgs(args, 4);
    } catch (error) {
      throw new Error("RangeCommandError", {
        cause: error,
      });
    }
  }
}

class ImgCommand implements Command {
  #factory: ContextFactory;

  constructor(factory: ContextFactory) {
    this.#factory = factory;
  }

  run(args: string): void {
    const match = RANGE_RE.exec(args);
    if (match === null) {
      return;
    }
    const [, name, pathname] = match;
    this.#factory.setImg(name, pathname);
  }
}

interface ContextOptions {
  vars: Map<string, string>;
  rangeX: RangeOptions;
  rangeY: RangeOptions;
}

export class Context {
  #vars: Map<string, string>;

  #rangeX: RangeOptions;

  #rangeY: RangeOptions;

  get vars(): IterableIterator<[string, string]> {
    return this.#vars.entries();
  }

  constructor({ vars, rangeX, rangeY }: ContextOptions) {
    this.#vars = vars;
    this.#rangeX = rangeX;
    this.#rangeY = rangeY;
  }

  getVar(name: string): string {
    const value = this.#vars.get(name);
    if (value === undefined) {
      throw new Error(`${name} is not defined`);
    }
    return value;
  }

  *[Symbol.iterator]() {
    for (const y of range(this.#rangeY)) {
      for (const x of range(this.#rangeX)) {
        yield [x, y];
      }
    }
  }
}

export class ContextFactory {
  #imgs: Map<string, string>;

  #vars: Map<string, string>;

  #ranges: Map<string, RangeOptions>;

  #commands: Record<string, Command>;

  constructor() {
    this.#imgs = new Map();
    this.#vars = new Map();
    this.#ranges = new Map();
    this.#commands = {
      var: new VarCommand(this),
      range: new RangeCommand(this),
      img: new ImgCommand(this),
    };
  }

  setVar(name: string, value: string): this {
    this.#vars.set(name, value);
    return this;
  }

  setRange(axis: string, value: RangeOptions): this {
    this.#ranges.set(axis, value);
    return this;
  }

  setImg(name: string, pathname: string): this {
    this.#imgs.set(name, pathname);
    return this;
  }

  run(command: string, args: string): void {
    const c = this.#commands[command];
    if (c === undefined) {
      console.warn("Invalid command:", command, args);
      return;
    }
    console.log(command, args);
    c.run(args);
  }

  build(): Context {
    return new Context({
      vars: new Map(this.#vars),
      rangeX: this.#ranges.get("x") as RangeOptions,
      rangeY: this.#ranges.get("y") as RangeOptions,
    });
  }
}
