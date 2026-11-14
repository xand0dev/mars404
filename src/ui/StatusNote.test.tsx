import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusNote } from './StatusNote';
import { STATUS_ICON, type StatusLevel } from './statusLevel';

describe('F7 · StatusNote', () => {
  it('F7-AC3: різні рівні мають різні іконки', () => {
    const levels = Object.keys(STATUS_ICON) as StatusLevel[];
    expect(levels).toEqual(expect.arrayContaining(['info', 'ok', 'warn', 'danger', 'pending', 'deficit']));
    expect(new Set(levels.map((l) => STATUS_ICON[l])).size).toBe(levels.length);
  });

  it('ризик передається іконкою і текстом, live region — за пропом', () => {
    render(<StatusNote level="deficit" live="alert">Deficit: o2</StatusNote>);
    const note = screen.getByRole('alert');
    expect(note).toHaveTextContent(STATUS_ICON.deficit);
    expect(note).toHaveTextContent('Deficit: o2');
  });
});
