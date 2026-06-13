import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNote, formatDate, esc } from '../shared/types';

describe('createNote', () => {
  it('creates a note with id, title, content, and timestamps', () => {
    const note = createNote('Hello', 'World content');
    expect(note.id).toBeDefined();
    expect(typeof note.id).toBe('string');
    expect(note.title).toBe('Hello');
    expect(note.content).toBe('World content');
    expect(typeof note.updatedAt).toBe('number');
    expect(typeof note.createdAt).toBe('number');
  });

  it('updatedAt equals createdAt on creation', () => {
    const note = createNote('Test', 'Content');
    expect(note.updatedAt).toBe(note.createdAt);
  });

  it('trims title whitespace', () => {
    const note = createNote('  Trim me  ', 'content');
    expect(note.title).toBe('Trim me');
  });

  it('keeps empty title as empty string', () => {
    const note = createNote('', '');
    expect(note.title).toBe('');
    expect(note.content).toBe('');
  });

  it('generates unique ids', () => {
    const a = createNote('a', '');
    const b = createNote('b', '');
    expect(a.id).not.toBe(b.id);
  });
});

describe('formatDate', () => {
  it('formats standard date correctly', () => {
    const ts = new Date(2025, 0, 15, 9, 5).getTime();
    expect(formatDate(ts)).toBe('2025-01-15 09:05');
  });

  it('handles year end boundary', () => {
    const ts = new Date(2025, 11, 31, 23, 59).getTime();
    expect(formatDate(ts)).toBe('2025-12-31 23:59');
  });

  it('pads single digits', () => {
    const ts = new Date(2025, 0, 1, 0, 0).getTime();
    expect(formatDate(ts)).toBe('2025-01-01 00:00');
  });
});

describe('esc (HTML escaping)', () => {
  it('escapes div tags', () => {
    expect(esc('<div>test</div>')).toBe('&lt;div&gt;test&lt;/div&gt;');
  });

  it('leaves plain text unchanged', () => {
    expect(esc('hello')).toBe('hello');
  });

  it('escapes ampersand', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('handles empty string', () => {
    expect(esc('')).toBe('');
  });

  it('escapes img tag', () => {
    expect(esc('<img src=x>')).toBe('&lt;img src=x&gt;');
  });
});
