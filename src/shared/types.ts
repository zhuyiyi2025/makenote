export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
}

export function createNote(title: string = '', content: string = ''): Note {
  const now = Date.now();
  return {
    id: 'n_' + now + '_' + Math.random().toString(36).slice(2, 8),
    title: title.trim(),
    content,
    updatedAt: now,
    createdAt: now,
  };
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
