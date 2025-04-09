export type Result<T> =
  | {
      success: boolean;
      data?: T;
    }
  | {
      success: false;
      message: string;
    };
