'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, buildQuery } from '@/lib/api';
import { useToast } from '@/app/providers';
import { Btn, Card, CardHead, Badge, Modal, Field, InputWrap, Empty } from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate } from '@/lib/utils';

type HolidayType = 'NATIONAL' | 'CUTI_BERSAMA';
type Holiday = { id: string; holidayDate: string; name: string; type: HolidayType };

const TYPE_META: Record<HolidayType, { label: string; variant: 'info' | 'accent' }> = {
  NATIONAL:     { label: 'Libur Nasional', variant: 'info' },
  CUTI_BERSAMA: { label: 'Cuti Bersama',   variant: 'accent' },
};

export default function HolidaysPage() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState<{ holidayDate: string; name: string; type: HolidayType }>({ holidayDate: '', name: '', type: 'NATIONAL' });
  const [year, setYear] = useState(new Date().getFullYear());

  const { data, isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays', year],
    queryFn: async () => (await api.get(`/national-holidays${buildQuery({ year })}`)).data,
  });

  const create = useMutation({
    mutationFn: async (payload: { holidayDate: string; name: string; type: HolidayType }) =>
      (await api.post('/national-holidays', payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      push('Hari libur ditambahkan', 'success');
      setOpenAdd(false);
      setForm({ holidayDate: '', name: '', type: 'NATIONAL' });
    },
    onError: (e: any) => push(e?.message ?? 'Gagal tambah hari libur', 'error'),
  });

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/national-holidays/${id}`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['holidays'] }); push('Hari libur dihapus', 'success'); },
    onError: (e: any) => push(e?.message ?? 'Gagal hapus hari libur', 'error'),
  });

  const sync = useMutation({
    mutationFn: async () => (await api.post('/national-holidays/sync', { year })).data,
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      push(`Sync ${year} selesai — ${r.created} baru, ${r.updated} diperbarui, ${r.unchanged} tetap`, 'success');
    },
    onError: (e: any) => push(e?.message ?? 'Gagal sinkronisasi hari libur', 'error'),
  });

  const holidays = data ?? [];
  const cuti = holidays.filter((h) => h.type === 'CUTI_BERSAMA');

  // Group by month
  const byMonth: Record<string, Holiday[]> = {};
  holidays.forEach((h) => {
    const m = new Date(h.holidayDate).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    (byMonth[m] = byMonth[m] || []).push(h);
  });

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Kalender Kerja</div>
          <h1>Hari Libur</h1>
          <div className="subtitle">
            {holidays.length} hari libur · {cuti.length} cuti bersama — perhitungan jatuh tempo invoice memperhitungkan hari libur.
          </div>
        </div>
        <div className="head-actions">
          <div style={{ display: 'flex', gap: 6 }}>
            {[year - 1, year, year + 1].map((y) => (
              <button key={y} className={`chip ${year === y ? 'active' : ''}`} onClick={() => setYear(y)}>{y}</button>
            ))}
          </div>
          <Btn icon={sync.isPending ? 'refresh' : 'download'} variant="default" onClick={() => sync.mutate()} loading={sync.isPending}>
            {sync.isPending ? 'Menyinkron…' : `Sync ${year}`}
          </Btn>
          <Btn icon="plus" variant="primary" onClick={() => setOpenAdd(true)}>Tambah manual</Btn>
        </div>
      </div>

      <div className="page-body col" style={{ gap: 16 }}>
        {/* Stats */}
        <div className="grid grid-3">
          <div className="stat">
            <div className="stat-label">Total hari libur</div>
            <div className="stat-value">{holidays.length}</div>
            <div className="stat-delta">Tahun {year}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Cuti bersama</div>
            <div className="stat-value">{cuti.length}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Sumber sinkronisasi</div>
            <div className="stat-value" style={{ fontSize: 15 }}>Libur Nasional ID</div>
            <div className="stat-delta">kalender resmi via GitHub</div>
          </div>
        </div>

        {isLoading && <div className="muted" style={{ fontSize: 13 }}>Memuat kalender...</div>}

        {!isLoading && holidays.length === 0 && (
          <Empty
            icon="calendar"
            title="Tidak ada data hari libur"
            sub={`Belum ada hari libur untuk tahun ${year}. Klik "Sync ${year}" untuk mengambil otomatis.`}
            action={<Btn icon="download" variant="primary" onClick={() => sync.mutate()} loading={sync.isPending}>Sync {year}</Btn>}
          />
        )}

        {Object.entries(byMonth).map(([month, items]) => (
          <Card key={month}>
            <CardHead title={month} badge={<Badge variant="mute" naked>{items.length} hari</Badge>} />
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 18 }}>Tanggal</th>
                    <th>Nama hari libur</th>
                    <th>Tipe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.sort((a, b) => a.holidayDate.localeCompare(b.holidayDate)).map((h) => {
                    const meta = TYPE_META[h.type] ?? TYPE_META.NATIONAL;
                    return (
                      <tr key={h.id}>
                        <td style={{ paddingLeft: 18 }}>
                          <span className="mono" style={{ fontSize: 13 }}>{formatDate(h.holidayDate)}</span>
                        </td>
                        <td className="cell-strong">{h.name}</td>
                        <td><Badge variant={meta.variant} naked>{meta.label}</Badge></td>
                        <td>
                          <button
                            className="iconbtn"
                            style={{ color: 'var(--danger)' }}
                            title="Hapus"
                            onClick={() => del.mutate(h.id)}
                            disabled={del.isPending}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Tambah hari libur manual"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpenAdd(false)}>Batal</Btn>
            <Btn
              variant="primary"
              icon="check"
              onClick={() => {
                if (!form.holidayDate || !form.name.trim()) { push('Tanggal & nama wajib diisi', 'error'); return; }
                create.mutate({ holidayDate: form.holidayDate, name: form.name.trim(), type: form.type });
              }}
              loading={create.isPending}
            >
              Tambah
            </Btn>
          </>
        }
      >
        <div className="col" style={{ gap: 14 }}>
          <Field label="Tanggal">
            <InputWrap icon="calendar">
              <input type="date" value={form.holidayDate} onChange={(e) => setForm((f) => ({ ...f, holidayDate: e.target.value }))}
                style={{ border: 0, outline: 0, background: 'transparent', flex: 1, height: '100%' }} />
            </InputWrap>
          </Field>
          <Field label="Nama hari libur">
            <InputWrap>
              <input placeholder="Cth. Hari raya lokal, libur khusus..." value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </InputWrap>
          </Field>
          <Field label="Tipe">
            <div className="row tight" style={{ gap: 6 }}>
              {(['NATIONAL', 'CUTI_BERSAMA'] as HolidayType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip ${form.type === t ? 'active' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                >
                  {TYPE_META[t].label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </>
  );
}
