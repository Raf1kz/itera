const tests = [];
let beforeEachHooks = [];
let afterEachHooks = [];
const suiteStack = [];
const registeredMocks = new Set();

function formatValue(value) {
  if (typeof value === 'string') return `"${value}"`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => deepEqual(a[key], b[key]));
}

function containsObject(actual, expected) {
  return Object.entries(expected).every(([key, value]) => {
    if (!(key in actual)) return false;
    return deepEqual(actual[key], value);
  });
}

function matcherFactory(actual, negated = false) {
  const assert = (condition, message) => {
    const finalCondition = negated ? !condition : condition;
    if (!finalCondition) {
      throw new Error(message);
    }
  };

  const base = {
    toBe(expected) {
      assert(Object.is(actual, expected), `Expected ${formatValue(actual)} to${negated ? ' not' : ''} be ${formatValue(expected)}`);
    },
    toEqual(expected) {
      assert(deepEqual(actual, expected), `Expected ${formatValue(actual)} to${negated ? ' not' : ''} equal ${formatValue(expected)}`);
    },
    toMatch(expected) {
      if (typeof actual !== 'string') {
        throw new Error(`Expected a string to match but received ${typeof actual}`);
      }
      if (expected instanceof RegExp) {
        assert(expected.test(actual), `Expected "${actual}" to${negated ? ' not' : ''} match ${expected}`);
      } else {
        assert(actual.includes(String(expected)), `Expected "${actual}" to${negated ? ' not' : ''} include "${expected}"`);
      }
    },
    toMatchObject(expected) {
      if (typeof actual !== 'object' || actual === null) {
        throw new Error(`Expected object for toMatchObject but received ${typeof actual}`);
      }
      assert(containsObject(actual, expected), `Expected ${formatValue(actual)} to${negated ? ' not' : ''} match object ${formatValue(expected)}`);
    },
    toHaveLength(expected) {
      if (actual == null || typeof actual.length !== 'number') {
        throw new Error(`Expected value with length property but received ${formatValue(actual)}`);
      }
      assert(actual.length === expected, `Expected length ${actual.length} to${negated ? ' not' : ''} be ${expected}`);
    },
    toHaveBeenCalled() {
      if (!actual?.mock) throw new Error('Value is not a mock function');
      assert(actual.mock.calls.length > 0, `Expected mock to${negated ? ' not' : ''} have been called`);
    },
    toHaveBeenCalledTimes(expected) {
      if (!actual?.mock) throw new Error('Value is not a mock function');
      assert(actual.mock.calls.length === expected, `Expected mock to${negated ? ' not' : ''} have been called ${expected} times but got ${actual.mock.calls.length}`);
    },
    toBeGreaterThan(expected) {
      if (typeof actual !== 'number' || typeof expected !== 'number') {
        throw new Error('toBeGreaterThan requires numeric values');
      }
      assert(actual > expected, `Expected ${actual} to${negated ? ' not' : ''} be greater than ${expected}`);
    }
  };

  if (!negated) {
    base.not = matcherFactory(actual, true);
  }

  return base;
}

export function expect(actual) {
  return matcherFactory(actual);
}

function fullTestName(name) {
  return [...suiteStack, name].join(' › ');
}

export function describe(name, fn) {
  suiteStack.push(name);
  try {
    fn();
  } finally {
    suiteStack.pop();
  }
}

export function it(name, fn) {
  tests.push({ name: fullTestName(name), fn });
}

export const test = it;

export function beforeEach(fn) {
  beforeEachHooks.push(fn);
}

export function afterEach(fn) {
  afterEachHooks.push(fn);
}

function createMock(impl = () => undefined) {
  let currentImpl = impl;
  const mockFn = (...args) => {
    mockFn.mock.calls.push(args);
    return currentImpl(...args);
  };

  mockFn.mock = {
    calls: []
  };

  mockFn.mockImplementation = (newImpl) => {
    currentImpl = newImpl;
    return mockFn;
  };

  mockFn.mockReturnValue = (value) => {
    currentImpl = () => value;
    return mockFn;
  };

  mockFn.mockResolvedValue = (value) => {
    currentImpl = () => Promise.resolve(value);
    return mockFn;
  };

  mockFn.mockClear = () => {
    mockFn.mock.calls = [];
  };

  mockFn.mockRestore = () => {
    currentImpl = impl;
    mockFn.mock.calls = [];
  };

  registeredMocks.add(mockFn);
  return mockFn;
}

export const vi = {
  fn: createMock,
  restoreAllMocks() {
    for (const mock of registeredMocks) {
      mock.mockRestore();
    }
    registeredMocks.clear();
  },
  resetModules() {
    // No-op for shim
  },
  resetAllMocks() {
    this.restoreAllMocks();
  }
};

export function clearRegistrations() {
  tests.length = 0;
  beforeEachHooks = [];
  afterEachHooks = [];
  suiteStack.length = 0;
  registeredMocks.clear();
}

export async function runRegisteredTests() {
  let passed = 0;
  let failed = 0;

  for (const testCase of tests) {
    try {
      for (const hook of beforeEachHooks) {
        await hook();
      }

      await testCase.fn();

      for (const hook of afterEachHooks) {
        await hook();
      }

      console.log(`✓ ${testCase.name}`);
      passed += 1;
    } catch (error) {
      console.error(`✗ ${testCase.name}`);
      console.error(error instanceof Error ? error.stack : error);
      failed += 1;
    } finally {
      vi.restoreAllMocks();
    }
  }

  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}
