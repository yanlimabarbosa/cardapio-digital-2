export type StoreModeFlags = {
  readonly forceClose: boolean;
  readonly forceOpen: boolean;
};

export type StoreModeUpdate = Partial<StoreModeFlags>;

export class StoreMode {
  private constructor(
    private readonly forceCloseValue: boolean,
    private readonly forceOpenValue: boolean,
  ) {}

  public static fromFlags(flags: StoreModeFlags): StoreMode {
    if (flags.forceClose && flags.forceOpen) {
      return new StoreMode(true, false);
    }

    return new StoreMode(flags.forceClose, flags.forceOpen);
  }

  public applyAdminUpdate(update: StoreModeUpdate): StoreMode {
    let forceClose = this.forceCloseValue;
    let forceOpen = this.forceOpenValue;

    if (update.forceClose !== undefined) {
      forceClose = update.forceClose;

      if (forceClose) {
        forceOpen = false;
      }
    }

    if (update.forceOpen !== undefined) {
      forceOpen = update.forceOpen;

      if (forceOpen) {
        forceClose = false;
      }
    }

    return StoreMode.fromFlags({ forceClose, forceOpen });
  }

  public toggleForceClose(): StoreMode {
    return this.applyAdminUpdate({ forceClose: !this.forceCloseValue });
  }

  public toggleForceOpen(): StoreMode {
    return this.applyAdminUpdate({ forceOpen: !this.forceOpenValue });
  }

  public toFlags(): StoreModeFlags {
    return {
      forceClose: this.forceCloseValue,
      forceOpen: this.forceOpenValue,
    };
  }
}
