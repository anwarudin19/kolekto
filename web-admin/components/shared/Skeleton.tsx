'use client';

import React from 'react';

type Props = {
  w?: string | number;
  h?: number;
  r?: number;
  style?: React.CSSProperties;
};

export function Skeleton({ w, h = 14, r = 6, style }: Props) {
  return (
    <>
      <span style={{
        display: 'inline-block',
        width: w ?? '100%',
        height: h,
        background: 'linear-gradient(90deg, var(--surface) 0%, var(--surface-2) 50%, var(--surface) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.6s ease-in-out infinite',
        borderRadius: r,
        ...style,
      }} />
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </>
  );
}

export function LoadingDashboard() {
  return (
    <>
      <div className="page-head">
        <div>
          <Skeleton w={130} h={11} />
          <div style={{ marginTop: 8 }}><Skeleton w={220} h={28} /></div>
          <div style={{ marginTop: 8 }}><Skeleton w={400} h={14} /></div>
        </div>
      </div>
      <div className="page-body col" style={{ gap: 20 }}>
        <div className="grid grid-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card card-pad">
              <Skeleton w={100} h={12} />
              <div style={{ marginTop: 12 }}><Skeleton w={140} h={28} /></div>
              <div style={{ marginTop: 6 }}><Skeleton w={80} h={11} /></div>
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-head"><Skeleton w={160} h={14} /></div>
            <div className="card-pad col" style={{ gap: 16 }}>
              <Skeleton w="100%" h={10} r={999} />
              <div className="grid grid-4" style={{ gap: 12 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{ padding: 12, background: 'var(--surface)', borderRadius: 12 }}>
                    <Skeleton w={60} h={9} /><div style={{ marginTop: 6 }}><Skeleton w={40} h={22} /></div>
                  </div>
                ))}
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row tight">
                    <Skeleton w={32} h={32} r={10} />
                    <div><Skeleton w={120} h={13} /><div style={{ marginTop: 6 }}><Skeleton w={180} h={10} /></div></div>
                  </div>
                  <Skeleton w={80} h={20} r={999} />
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad col" style={{ gap: 14 }}>
            <Skeleton w={160} h={14} />
            <Skeleton w="100%" h={130} r={10} />
            {[1,2,3].map(i => <Skeleton key={i} w="100%" h={28} r={8} />)}
          </div>
        </div>
      </div>
    </>
  );
}
