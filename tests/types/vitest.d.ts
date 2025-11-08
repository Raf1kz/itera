declare module 'vitest' {
  type AnyFn = (...args: any[]) => any;

  interface MockFunction<T extends AnyFn = AnyFn> {
    (...args: Parameters<T>): ReturnType<T>;
    mock: {
      calls: any[][];
    };
    mockImplementation(impl: T): MockFunction<T>;
    mockReturnValue(value: ReturnType<T>): MockFunction<T>;
    mockResolvedValue(value: any): MockFunction<T>;
    mockClear(): void;
    mockRestore(): void;
  }

  interface Vi {
    fn<T extends AnyFn = AnyFn>(impl?: T): MockFunction<T>;
    restoreAllMocks(): void;
    resetModules(): void;
    resetAllMocks(): void;
  }

  type TestFn = () => unknown | Promise<unknown>;

  export const vi: Vi;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: TestFn): void;
  export function test(name: string, fn: TestFn): void;
  export function beforeEach(fn: TestFn): void;
  export function afterEach(fn: TestFn): void;
  export function expect(actual: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toMatch(expected: RegExp | string): void;
    toMatchObject(expected: Record<string, unknown>): void;
    toHaveLength(expected: number): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toBeGreaterThan(expected: number): void;
    not: {
      toHaveBeenCalled(): void;
      toHaveBeenCalledTimes(expected: number): void;
      toBe(expected: any): void;
      toEqual(expected: any): void;
    };
  };
}
