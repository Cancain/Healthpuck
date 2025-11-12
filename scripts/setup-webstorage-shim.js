/* eslint-env node */
/* global globalThis */

/**
 * Minimal in-memory implementation of the Web Storage API for Node.
 * Provides enough surface area for libraries that expect to probe
 * `localStorage`/`sessionStorage` during build time.
 */

const createStore = () => {
  const store = new Map();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key) {
      const normalized = String(key);
      return store.has(normalized) ? (store.get(normalized) ?? null) : null;
    },
    key(index) {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    removeItem(key) {
      store.delete(String(key));
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
  };
};

const install = (name) => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    if (descriptor && descriptor.configurable === false) {
      return;
    }
  } catch {
    // ignore descriptor lookup failures
  }

  try {
    Reflect.deleteProperty(globalThis, name);
  } catch {
    // ignore delete failures
  }

  const store = createStore();
  try {
    Object.defineProperty(globalThis, name, {
      value: store,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  } catch {
    globalThis[name] = store;
  }
};

install("localStorage");
install("sessionStorage");
