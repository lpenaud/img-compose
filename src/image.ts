export interface MagickImage {
  name: string;
  content: Uint8Array;
}

class MagickImageDefault implements MagickImage {
  #name: string;

  #content: Uint8Array;

  get name(): string {
    return this.#name;
  }

  get content(): Uint8Array {
    return this.#content;
  }

  constructor(name: string, content: Uint8Array) {
    this.#name = name;
    this.#content = content;
  }
}

export function fromFile(pathname: string): MagickImage {
  return new MagickImageDefault(pathname, new Uint8Array(0));
}

export function fromBuffer(
  type: string,
  buffer: Uint8Array,
): MagickImageDefault {
  return new MagickImageDefault(`${type}:-`, buffer);
}
