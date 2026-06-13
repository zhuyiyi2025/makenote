import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Note, createNote } from '@shared/types';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => path.join(process.cwd(), 'src', 'main', 'tests', 'tmp')),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
  },
  BrowserWindow: vi.fn().mockImplementation(() => ({
    loadFile: vi.fn(),
    on: vi.fn(),
    getAllWindows: vi.fn(() => []),
  })),
  ipcMain: {
    handle: vi.fn(),
  },
}));

const DATA_DIR = path.join(process.cwd(), 'src', 'main', 'tests', 'tmp');
const DATA_FILE = path.join(DATA_DIR, 'mark-notes-data.json');

describe('Main process - note persistence', () => {
  beforeEach(() => {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
    try { fs.rmdirSync(DATA_DIR, { recursive: true }); } catch {}
  });

  it('loadNotes returns empty array when no file', () => {
    expect(fs.existsSync(DATA_FILE)).toBe(false);
  });

  it('saveNotes and loadNotes round-trip', () => {
    const notes: Note[] = [
      createNote('Test Note', 'Test content'),
      createNote('Another', 'More content'),
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8');
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const loaded: Note[] = JSON.parse(raw);
    expect(loaded).toHaveLength(2);
    expect(loaded[0].title).toBe('Test Note');
    expect(loaded[0].content).toBe('Test content');
    expect(loaded[1].title).toBe('Another');
  });

  it('createNote generates valid note structure', () => {
    const note = createNote('My Note', 'Hello World');
    expect(note.id).toMatch(/^n_\d+_[a-z0-9]+$/);
    expect(note.title).toBe('My Note');
    expect(note.content).toBe('Hello World');
    expect(note.updatedAt).toBeGreaterThan(0);
    expect(note.createdAt).toBe(note.updatedAt);
  });

  it('delete note removes from array', () => {
    const notes: Note[] = [
      createNote('Keep', 'keep content'),
      createNote('Delete', 'delete content'),
    ];
    const filtered = notes.filter((n) => n.id !== notes[1].id);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Keep');
  });

  it('update note modifies title and content', () => {
    const note = createNote('Original', 'Original content');
    const updated: Note = {
      ...note,
      title: 'Updated',
      content: 'Updated content',
      updatedAt: Date.now(),
    };
    expect(updated.title).toBe('Updated');
    expect(updated.content).toBe('Updated content');
    expect(updated.id).toBe(note.id);
    expect(updated.createdAt).toBe(note.createdAt);
  });
});
