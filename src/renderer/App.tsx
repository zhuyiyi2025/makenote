import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Note } from '../shared/types';

declare global {
  interface Window {
    notesAPI: {
      getAll: () => Promise<Note[]>;
      create: (title?: string, content?: string) => Promise<Note>;
      update: (note: Note) => Promise<Note>;
      delete: (id: string) => Promise<string>;
    };
  }
}

const api = window.notesAPI;

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('就绪');
  const [toast, setToast] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const loadNotes = useCallback(async () => {
    const all = await api.getAll();
    setNotes(all);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const filtered = notes
    .filter((n) => {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
    }
  }, [activeNote]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleNew = async () => {
    const note = await api.create();
    await loadNotes();
    setActiveId(note.id);
    setTitle('');
    setContent('');
    setStatus('新建笔记');
    setTimeout(() => titleRef.current?.focus(), 50);
  };

  const handleSave = async () => {
    if (!activeId) return;
    const updated = await api.update({
      id: activeId,
      title: title.trim(),
      content,
      updatedAt: Date.now(),
      createdAt: activeNote?.createdAt || Date.now(),
    });
    await loadNotes();
    setStatus('已保存 ' + formatDate(updated.updatedAt));
    showToast('笔记已保存');
  };

  const handleDelete = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    if (!confirm('确定要删除「' + (note.title || '无标题笔记') + '」吗？')) return;
    await api.delete(id);
    if (activeId === id) {
      setActiveId(null);
      setTitle('');
      setContent('');
    }
    await loadNotes();
    showToast('笔记已保存');
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    const note = notes.find((n) => n.id === id);
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    }
  };

  const wordCount = content.length;

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>📒 马克笔记</h1>
          <button className="btn-new" onClick={handleNew} title="新建笔记">+ 新建</button>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索笔记..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="note-list">
          {filtered.length === 0 ? (
            <div className="empty-list">
              {search ? '未找到匹配的笔记' : '暂无笔记，点击"新建"开始'}
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`note-item${n.id === activeId ? ' active' : ''}`}
                onClick={() => handleSelect(n.id)}
              >
                <div className="note-item-title">{esc(n.title || '无标题笔记')}</div>
                <div className="note-item-preview">
                  {esc(n.content.slice(0, 60).replace(/\n/g, ' ') || '无内容')}
                </div>
                <div className="note-item-date">{formatDate(n.updatedAt)}</div>
                <button
                  className="btn-delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  title="删除"
                >✕</button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {!activeId ? (
          <div className="empty-main">
            <div className="icon">📝</div>
            <div>选择或新建一个笔记</div>
          </div>
        ) : (
          <>
            <div className="main-header">
              <input
                ref={titleRef}
                className="title-input"
                placeholder="无标题笔记"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button className="btn-save" onClick={handleSave}>保存</button>
            </div>
            <div className="editor">
              <textarea
                ref={contentRef}
                placeholder="开始写作..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="status-bar">
              <span>{status}</span>
              <span>{wordCount} 字</span>
            </div>
          </>
        )}
      </main>

      {/* Toast */}
      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}
