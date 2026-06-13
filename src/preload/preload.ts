import { contextBridge, ipcRenderer } from 'electron';
import { Note } from '../shared/types';

export interface NotesAPI {
  getAll: () => Promise<Note[]>;
  create: (title?: string, content?: string) => Promise<Note>;
  update: (note: Note) => Promise<Note>;
  delete: (id: string) => Promise<string>;
}

contextBridge.exposeInMainWorld('notesAPI', {
  getAll: () => ipcRenderer.invoke('notes:getAll'),
  create: (title: string = '', content: string = '') => ipcRenderer.invoke('notes:create', title, content),
  update: (note: Note) => ipcRenderer.invoke('notes:update', note),
  delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
} as NotesAPI);
