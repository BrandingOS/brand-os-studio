import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isTextEntryTarget, startHistoryKeyboard, useHistoryRegistry } from './historyRegistry';
import type { UndoScope } from './types';

function fakeScope(id: string, over: Partial<UndoScope> = {}): UndoScope & { undo: ReturnType<typeof vi.fn>; redo: ReturnType<typeof vi.fn> } {
  return {
    id,
    label: id,
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: () => true,
    canRedo: () => true,
    ...over,
  } as never;
}

beforeEach(() => useHistoryRegistry.setState({ scopes: [], version: 0 }));

describe('arbitration', () => {
  it('routes to the most recently registered scope', () => {
    const outer = fakeScope('outer');
    const inner = fakeScope('inner');
    useHistoryRegistry.getState().register(outer);
    useHistoryRegistry.getState().register(inner);

    useHistoryRegistry.getState().undo();
    expect(inner.undo).toHaveBeenCalled();
    expect(outer.undo).not.toHaveBeenCalled();
  });

  it('hands the keys back when the top scope unmounts', () => {
    const outer = fakeScope('outer');
    const inner = fakeScope('inner');
    useHistoryRegistry.getState().register(outer);
    const drop = useHistoryRegistry.getState().register(inner);
    drop();

    useHistoryRegistry.getState().undo();
    expect(outer.undo).toHaveBeenCalled();
  });

  it('does nothing at all when no scope is registered', () => {
    expect(useHistoryRegistry.getState().undo()).toBe(false);
    expect(useHistoryRegistry.getState().redo()).toBe(false);
  });

  it('does not call a scope that says it cannot undo', () => {
    const scope = fakeScope('x', { canUndo: () => false });
    useHistoryRegistry.getState().register(scope);
    expect(useHistoryRegistry.getState().undo()).toBe(false);
    expect(scope.undo).not.toHaveBeenCalled();
  });
});

describe('the text-entry guard', () => {
  const make = (html: string) => {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    return host.firstElementChild as HTMLElement;
  };
  afterEach(() => { document.body.innerHTML = ''; });

  it('protects the browser’s own undo inside real text fields', () => {
    expect(isTextEntryTarget(make('<input />'))).toBe(true);
    expect(isTextEntryTarget(make('<input type="text" />'))).toBe(true);
    expect(isTextEntryTarget(make('<textarea></textarea>'))).toBe(true);
    expect(isTextEntryTarget(make('<div contenteditable="true"></div>'))).toBe(true);
  });

  it('reaches through a nested element inside a contentEditable region', () => {
    // contentEditable is inherited, so checking the target's own attribute
    // misses every click that lands on a child.
    const root = make('<div contenteditable="true"><span><b>text</b></span></div>');
    expect(isTextEntryTarget(root.querySelector('b'))).toBe(true);
  });

  it('does not treat non-text controls as text entry', () => {
    expect(isTextEntryTarget(make('<input type="color" />'))).toBe(false);
    expect(isTextEntryTarget(make('<input type="checkbox" />'))).toBe(false);
    expect(isTextEntryTarget(make('<input type="range" />'))).toBe(false);
    expect(isTextEntryTarget(make('<select></select>'))).toBe(false);
    expect(isTextEntryTarget(make('<button>hi</button>'))).toBe(false);
  });

  it('ignores fields with no native undo to protect', () => {
    expect(isTextEntryTarget(make('<input readonly />'))).toBe(false);
    expect(isTextEntryTarget(make('<textarea disabled></textarea>'))).toBe(false);
    expect(isTextEntryTarget(make('<div contenteditable="false"></div>'))).toBe(false);
  });

  it('survives a target that is not an element', () => {
    expect(isTextEntryTarget(null)).toBe(false);
    expect(isTextEntryTarget(window as unknown as EventTarget)).toBe(false);
  });
});

describe('the keyboard arbiter', () => {
  let stop: () => void;
  beforeEach(() => { stop = startHistoryKeyboard(window); });
  afterEach(() => { stop(); document.body.innerHTML = ''; });

  const press = (init: KeyboardEventInit, target: EventTarget = window) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };

  it('maps the mac and windows bindings', () => {
    const scope = fakeScope('s');
    useHistoryRegistry.getState().register(scope);

    press({ key: 'z', metaKey: true });
    expect(scope.undo).toHaveBeenCalledTimes(1);

    press({ key: 'z', metaKey: true, shiftKey: true });
    expect(scope.redo).toHaveBeenCalledTimes(1);

    press({ key: 'z', ctrlKey: true });
    expect(scope.undo).toHaveBeenCalledTimes(2);

    press({ key: 'z', ctrlKey: true, shiftKey: true });
    expect(scope.redo).toHaveBeenCalledTimes(2);

    press({ key: 'y', ctrlKey: true });
    expect(scope.redo).toHaveBeenCalledTimes(3);
  });

  it('accepts an uppercase key, which is what shift produces', () => {
    const scope = fakeScope('s');
    useHistoryRegistry.getState().register(scope);
    press({ key: 'Z', metaKey: true, shiftKey: true });
    expect(scope.redo).toHaveBeenCalledTimes(1);
  });

  it('leaves the browser alone while the user is typing', () => {
    const scope = fakeScope('s');
    useHistoryRegistry.getState().register(scope);
    const input = document.createElement('input');
    document.body.appendChild(input);

    const event = press({ key: 'z', metaKey: true }, input);
    expect(scope.undo).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('takes the keys inside text when the scope owns text editing', () => {
    const scope = fakeScope('s', { ownsTextInput: true });
    useHistoryRegistry.getState().register(scope);
    const input = document.createElement('input');
    document.body.appendChild(input);

    press({ key: 'z', metaKey: true }, input);
    expect(scope.undo).toHaveBeenCalled();
  });

  it('stays out of the way when nothing has registered', () => {
    // This is what lets the arbiter land beside the ad-hoc ⌘Z listeners that
    // already exist without changing any of their behaviour.
    const event = press({ key: 'z', metaKey: true });
    expect(event.defaultPrevented).toBe(false);
  });

  it('does not swallow the event at the end of the stack', () => {
    const scope = fakeScope('s', { canUndo: () => false });
    useHistoryRegistry.getState().register(scope);
    const event = press({ key: 'z', metaKey: true });
    expect(event.defaultPrevented).toBe(false);
  });

  it('swallows it when something actually moved', () => {
    useHistoryRegistry.getState().register(fakeScope('s'));
    expect(press({ key: 'z', metaKey: true }).defaultPrevented).toBe(true);
  });

  it('ignores unmodified keys and unrelated shortcuts', () => {
    const scope = fakeScope('s');
    useHistoryRegistry.getState().register(scope);
    press({ key: 'z' });
    press({ key: 's', metaKey: true });
    expect(scope.undo).not.toHaveBeenCalled();
  });

  it('stops listening once torn down', () => {
    const scope = fakeScope('s');
    useHistoryRegistry.getState().register(scope);
    stop();
    press({ key: 'z', metaKey: true });
    expect(scope.undo).not.toHaveBeenCalled();
    stop = () => {};
  });
});
