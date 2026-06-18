export interface FullscreenState {
  readonly active: boolean;
  readonly element: Element | null;
  readonly target: HTMLElement | undefined;
  readonly available: boolean;
}

export type FullscreenStateHandler = (state: FullscreenState) => void;

export interface FullscreenManagerOptions {
  readonly target?: HTMLElement;
  readonly keyboard?: boolean;
  readonly document?: Document;
  readonly onChange?: FullscreenStateHandler;
}

/**
 * Manages browser fullscreen state, F11 toggling, and fullscreenchange synchronization.
 */
export class FullscreenManager {
  private target: HTMLElement | undefined;
  private readonly keyboard: boolean;
  private readonly onChange: FullscreenStateHandler | undefined;
  private documentRef: Document | undefined;
  private attached = false;

  private readonly handleFullscreenChangeEvent = (): void => {
    this.emitChange();
  };

  private readonly handleKeyDownEvent = (event: KeyboardEvent): void => {
    this.onKeyDown(event);
  };

  public constructor(options: FullscreenManagerOptions = {}) {
    this.target = options.target;
    this.keyboard = options.keyboard ?? true;
    this.documentRef = options.document ?? options.target?.ownerDocument;
    this.onChange = options.onChange;
  }

  /**
   * Attach fullscreenchange and optional F11 keyboard listeners.
   */
  public attach(target = this.target): void {
    if (this.attached) {
      return;
    }

    if (target) {
      this.target = target;
      this.documentRef = target.ownerDocument;
    }

    const documentRef = this.requireDocument();
    documentRef.addEventListener("fullscreenchange", this.handleFullscreenChangeEvent);

    if (this.keyboard) {
      documentRef.addEventListener("keydown", this.handleKeyDownEvent);
    }

    this.attached = true;
  }

  /**
   * Detach fullscreen and keyboard listeners.
   */
  public detach(): void {
    if (!this.attached) {
      return;
    }

    const documentRef = this.requireDocument();
    documentRef.removeEventListener("fullscreenchange", this.handleFullscreenChangeEvent);

    if (this.keyboard) {
      documentRef.removeEventListener("keydown", this.handleKeyDownEvent);
    }

    this.attached = false;
  }

  /**
   * Return whether DOM listeners are attached.
   */
  public isAttached(): boolean {
    return this.attached;
  }

  /**
   * Enter browser fullscreen for the configured or provided target.
   */
  public async enter(target = this.target): Promise<FullscreenState> {
    if (!target) {
      throw new Error("Fullscreen target is required.");
    }

    this.target = target;
    this.documentRef = target.ownerDocument;

    if (!isFullscreenAvailable(this.documentRef, target)) {
      throw new Error("Fullscreen API is not available.");
    }

    await target.requestFullscreen();

    return this.getState();
  }

  /**
   * Exit browser fullscreen when active.
   */
  public async exit(): Promise<FullscreenState> {
    const documentRef = this.requireDocument();

    if (!documentRef.fullscreenElement) {
      return this.emitChange();
    }

    await documentRef.exitFullscreen();

    return this.getState();
  }

  /**
   * Toggle browser fullscreen state.
   */
  public async toggle(target = this.target): Promise<FullscreenState> {
    const documentRef = this.requireDocument(target);

    if (documentRef.fullscreenElement) {
      return this.exit();
    }

    return this.enter(target);
  }

  /**
   * Return a current fullscreen state snapshot.
   */
  public getState(): FullscreenState {
    const documentRef = this.resolveDocument();
    const element = documentRef?.fullscreenElement ?? null;

    return {
      active: element !== null,
      element,
      target: this.target,
      available: documentRef !== undefined && isFullscreenAvailable(documentRef, this.target)
    };
  }

  /**
   * Sync state from the document and notify listeners.
   */
  public sync(): FullscreenState {
    return this.emitChange();
  }

  /**
   * Detach listeners and clear the current target reference.
   */
  public destroy(): void {
    this.detach();
    this.target = undefined;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "F11") {
      return;
    }

    event.preventDefault();
    void this.toggle();
  }

  private emitChange(): FullscreenState {
    const state = this.getState();
    this.onChange?.(state);

    return state;
  }

  private requireDocument(target = this.target): Document {
    const documentRef = target?.ownerDocument ?? this.documentRef ?? resolveDefaultDocument();
    this.documentRef = documentRef;

    return documentRef;
  }

  private resolveDocument(): Document | undefined {
    return this.target?.ownerDocument ?? this.documentRef ?? resolveOptionalDocument();
  }
}

const resolveDefaultDocument = (): Document => {
  if (typeof document === "undefined") {
    throw new Error("Document is not available in this environment.");
  }

  return document;
};

const resolveOptionalDocument = (): Document | undefined => {
  if (typeof document === "undefined") {
    return undefined;
  }

  return document;
};

const isFullscreenAvailable = (documentRef: Document, target: HTMLElement | undefined): boolean =>
  documentRef.fullscreenEnabled &&
  target !== undefined &&
  typeof target.requestFullscreen === "function" &&
  typeof documentRef.exitFullscreen === "function";
