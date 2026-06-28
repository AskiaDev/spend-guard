import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const createStorage = (): Storage => {
  let store: Record<string, string> = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
};

vi.stubGlobal("localStorage", createStorage());

// Radix UI jsdom polyfills (Select, etc.)
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = vi.fn(() => false);
Element.prototype.releasePointerCapture = vi.fn();
// Vaul (Drawer) drag handlers call setPointerCapture and read a string `transform`.
Element.prototype.setPointerCapture = vi.fn();
const realGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element, pseudoElement?: string | null) => {
  const declaration = realGetComputedStyle(element, pseudoElement ?? undefined);
  if (declaration.transform === "") {
    declaration.transform = "none";
  }
  return declaration;
}) as typeof window.getComputedStyle;

// Radix RadioGroup (via @radix-ui/react-use-size) reads ResizeObserver, which jsdom omits.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);
