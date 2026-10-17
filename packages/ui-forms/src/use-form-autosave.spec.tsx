import { useForm } from 'react-hook-form';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, jest } from 'bun:test';

import { useFormAutosave } from './use-form-autosave';

const KEY = 'draft:spec';

interface Values {
  title: string;
}

function mount(storageKey = KEY) {
  return renderHook(() => {
    const form = useForm<Values>({ defaultValues: { title: '' } });
    return { form, autosave: useFormAutosave(form, storageKey) };
  });
}

const stored = () => {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as { savedAt: number; values: Values }) : null;
};

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe('useFormAutosave', () => {
  it('writes a snapshot once the author pauses', () => {
    const { result } = mount();

    act(() => result.current.form.setValue('title', 'Draft'));
    expect(stored()).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1300);
    });

    expect(stored()?.values.title).toBe('Draft');
  });

  it('writes a change still waiting on the debounce when the form unmounts', () => {
    const { result, unmount } = mount();

    act(() => result.current.form.setValue('title', 'Closed too soon'));
    unmount();

    expect(stored()?.values.title).toBe('Closed too soon');
  });

  it('leaves no draft behind after clear, even inside the debounce window', () => {
    const { result, unmount } = mount();

    act(() => result.current.form.setValue('title', 'Saved'));
    act(() => result.current.autosave.clear());
    unmount();

    expect(stored()).toBeNull();
  });

  it('offers a stored draft and restores it only on request', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ savedAt: 1_700_000_000_000, values: { title: 'Old' } })
    );
    const { result } = mount();

    expect(result.current.autosave.restorable?.getTime()).toBe(
      1_700_000_000_000
    );
    expect(result.current.form.getValues('title')).toBe('');

    act(() => result.current.autosave.restore());

    expect(result.current.form.getValues('title')).toBe('Old');
    expect(result.current.autosave.restorable).toBeNull();
  });

  it('keeps the stored draft safe from the first keystroke until the author decides', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ savedAt: 1, values: { title: 'Old' } })
    );
    const { result, unmount } = mount();

    act(() => result.current.form.setValue('title', 'New'));
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    unmount();

    expect(stored()?.values.title).toBe('Old');
  });

  it('removes a draft that is not one, and offers nothing', () => {
    for (const bad of [
      'not json',
      '{"savedAt":"yesterday","values":{}}',
      '{"savedAt":1}',
      'null',
    ]) {
      localStorage.setItem(KEY, bad);
      const { result, unmount } = mount();

      expect(result.current.autosave.restorable).toBeNull();
      expect(localStorage.getItem(KEY)).toBeNull();
      unmount();
    }
  });

  it('survives storage that refuses to write or remove', () => {
    const original = Object.getOwnPropertyDescriptor(
      globalThis,
      'localStorage'
    );
    const refuse = () => {
      throw new Error('storage is blocked');
    };
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => null, setItem: refuse, removeItem: refuse },
    });

    try {
      // The stand-in must be what the hook reaches, or this proves nothing.
      expect(() => localStorage.removeItem(KEY)).toThrow();

      const { result, unmount } = mount();

      act(() => result.current.form.setValue('title', 'x'));
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1300);
        });
        act(() => result.current.autosave.discard());
        act(() => result.current.autosave.clear());
        unmount();
      }).not.toThrow();
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original);
    }
  });
});
