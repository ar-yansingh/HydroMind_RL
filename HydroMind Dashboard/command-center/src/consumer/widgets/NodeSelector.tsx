import React, { useState, useMemo } from 'react';
import { allProfiles, UserProfile } from '../userProfiles';
import { useUIStore } from '../../store/uiStore';

export default function NodeSelector() {
  const { consumerNodeId, setConsumerNodeId } = useUIStore();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return allProfiles.slice(0, 50);
    const q = search.toLowerCase();
    return allProfiles.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.nodeId.toLowerCase().includes(q) ||
      p.categoryLabel.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [search]);

  const current = allProfiles.find(p => p.nodeId === consumerNodeId);

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer', fontSize: 13, color: '#0f172a', fontWeight: 500,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <span style={{ fontSize: 16 }}>👤</span>
        <span>{current?.name || consumerNodeId}</span>
        <span style={{ fontSize: 10, color: '#64748b' }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6,
          width: 340, maxHeight: 360, background: '#fff',
          borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          zIndex: 9999, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              type="text"
              placeholder="Search by name, node, or type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid #e2e8f0', fontSize: 12,
                outline: 'none', color: '#0f172a',
              }}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(p => (
              <button
                key={p.nodeId}
                onClick={() => { setConsumerNodeId(p.nodeId); setOpen(false); setSearch(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: p.nodeId === consumerNodeId ? '#f0fdf4' : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  borderBottom: '1px solid #f8fafc',
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{p.categoryIcon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>{p.address}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#0d9488', fontFamily: "'JetBrains Mono', monospace" }}>{p.nodeId}</div>
                  {p.priority && <div style={{ fontSize: 9, color: '#dc2626', fontWeight: 600 }}>⚡ Priority</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click-away overlay */}
      {open && <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />}
    </div>
  );
}
