declare module '@playwright/test' {
  interface Locator {
    isVisible(): Promise<boolean>;
  }

  interface Expectation {
    toBeVisible(): Promise<void>;
  }

  interface Page {
    goto(url: string): Promise<void>;
    getByRole(role: string, options: { name?: string | RegExp }): Locator;
  }

  type TestFn = (name: string, handler: (context: { page: Page }) => Promise<void> | void) => void;

  export const test: TestFn;
  export const expect: (value: Locator) => Expectation;
}
