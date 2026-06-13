import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Note, createNote } from '../shared/types';

const DATA_FILE = path.join(app.getPath('userData'), 'mark-notes-data.json');

function loadNotes(): Note[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8');
}

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '马克笔记',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('notes:getAll', async (): Promise<Note[]> => {
  return loadNotes();
});

ipcMain.handle('notes:create', async (_event, title: string, content: string): Promise<Note> => {
  const note = createNote(title, content);
  const notes = loadNotes();
  notes.unshift(note);
  saveNotes(notes);
  return note;
});

ipcMain.handle('notes:update', async (_event, note: Note): Promise<Note> => {
  const notes = loadNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx !== -1) {
    note.updatedAt = Date.now();
    notes[idx] = note;
    saveNotes(notes);
  }
  return note;
});

ipcMain.handle('notes:delete', async (_event, id: string): Promise<string> => {
  const notes = loadNotes();
  const filtered = notes.filter((n) => n.id !== id);
  saveNotes(filtered);
  return id;
});
