import React from 'react';
import { UserProfile } from '../userProfiles';

interface Props { profile: UserProfile; }

export default function ProfileCard({ profile }: Props) {
  const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarBg = profile.category === 'critical' ? '#dc2626' : profile.category === 'commercial' ? '#2563eb' : '#0d9488';

  return (
    <div className="consumer-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: avatarBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
            {profile.name}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{profile.address}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span className="consumer-badge" style={{ background: '#f1f5f9', color: '#475569' }}>
          {profile.categoryLabel}
        </span>
        <span className="consumer-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
          Node: {profile.nodeId}
        </span>
        {profile.priority && (
          <span className="consumer-badge" style={{ background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>
            ⚡ Priority Supply
          </span>
        )}
      </div>
    </div>
  );
}
