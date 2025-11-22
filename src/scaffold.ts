export type Listener<T> = (payload: T) => void;

export class Emitter<T = void> {
  private listeners: Listener<T>[] = [];

  event(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => this._remove(listener);
  }

  fire(payload: T): void {
    for (const l of this.listeners.slice()) l(payload);
  }

  private _remove(listener: Listener<T>): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }
}

export class Button {
  constructor(public el: HTMLButtonElement) {}
  onClick(fn: (e: MouseEvent) => void): void {
    this.el.addEventListener("click", fn);
  }
  setDisabled(v: boolean): void {
    this.el.disabled = v;
  }
}

export class RangeNumberPair {
  constructor(
    public rangeEl: HTMLInputElement,
    public numberEl: HTMLInputElement,
  ) {
    this.rangeEl.addEventListener("input", () => {
      this.numberEl.value = this.rangeEl.value;
    });
    this.numberEl.addEventListener("input", () => {
      this.rangeEl.value = this.numberEl.value;
    });
  }
}

export class RadioGroup {
  private root: HTMLElement;
  private emitter = new Emitter<string>();
  constructor(
    containerSelector: string,
    public name: string,
  ) {
    const el = document.querySelector(containerSelector);
    if (!el) throw new Error(`RadioGroup root not found: ${containerSelector}`);
    this.root = el as HTMLElement;
    this.root.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement | null;
      if (target && target.name === name) this.emitter.fire(target.value);
    });
  }

  get value(): string {
    const selected = this.root.querySelector<HTMLInputElement>(
      `input[name="${this.name}"]:checked`,
    );
    if (!selected) throw new Error(`No radio selected for ${this.name}`);
    return selected.value;
  }

  onChange(fn: (val: string) => void): () => void {
    return this.emitter.event(fn);
  }
}

export class FileInput {
  private emitter = new Emitter<FileList | null>();
  constructor(public el: HTMLInputElement) {
    this.el.addEventListener(
      "change",
      () => void this.emitter.fire(this.el.files),
    );
  }
  onChange(fn: (files: FileList | null) => void): () => void {
    return this.emitter.event(fn);
  }
  getFiles(): FileList | null {
    return this.el.files;
  }
}

export class Status {
  constructor(public el: HTMLElement) {}
  update(msg: string, isError = false): void {
    this.el.textContent = msg;
    this.el.classList.toggle("error", !!isError);
  }
}
