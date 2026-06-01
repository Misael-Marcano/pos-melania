import { describe, it, expect } from 'vitest';
import { isEditableTarget, POS_BILLETES_RD } from './pos-keyboard-shortcuts';

describe('pos-keyboard-shortcuts', () => {
  it('POS_BILLETES_RD tiene 6 denominaciones en orden descendente', () => {
    expect(POS_BILLETES_RD).toEqual([2000, 1000, 500, 200, 100, 50]);
  });

  it('isEditableTarget detecta inputs y contenteditable', () => {
    const input = document.createElement('input');
    expect(isEditableTarget(input)).toBe(true);

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(isEditableTarget(editable)).toBe(true);

    const span = document.createElement('span');
    expect(isEditableTarget(span)).toBe(false);
  });
});
