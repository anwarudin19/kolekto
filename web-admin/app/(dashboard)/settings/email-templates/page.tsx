'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/app/providers';
import { useUser } from '@/hooks/useAuth';
import {
  Btn,
  Badge,
  Card,
  CardHead,
  Empty,
  Field,
  InputWrap,
  Modal,
  StatusBadge,
} from '@/components/ui';
import { Icon } from '@/components/icons/Icon';
import { formatDate } from '@/lib/utils';
import type {
  EmailTemplate,
  EmailTemplatePreview,
  EmailTemplateType,
} from '@/types';

const TYPE_LABELS: Record<EmailTemplateType, string> = {
  RESET_PASSWORD: 'Reset Password',
  VERIFY_EMAIL: 'Verify Email',
  INVOICE_REMINDER: 'Invoice Reminder',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  TEAM_INVITATION: 'Team Invitation',
  LICENSE_EXPIRING: 'License Expiring',
};

const TYPE_OPTIONS = Object.keys(TYPE_LABELS) as EmailTemplateType[];

type FormState = {
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
};

export default function EmailTemplatesPage() {
  const user = useUser();

  if (!user?.isSuperAdmin) {
    return (
      <div className="page-body" style={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <div style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
          <Icon name="shield" size={40} style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, fontSize: 15 }}>Akses ditolak</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Halaman ini hanya untuk Super Admin.</div>
        </div>
      </div>
    );
  }

  return <EmailTemplateManager />;
}

function EmailTemplateManager() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<EmailTemplateType | 'ALL'>('ALL');
  const [form, setForm] = useState<FormState>({ name: '', subject: '', htmlBody: '', textBody: '' });
  const [preview, setPreview] = useState<EmailTemplatePreview | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const templatesQuery = useQuery<EmailTemplate[]>({
    queryKey: ['email-templates'],
    queryFn: async () => (await api.get<EmailTemplate[]>('/email-templates')).data,
  });

  const templates = templatesQuery.data ?? [];
  const selected = templates.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(
    () => templates.filter((item) => typeFilter === 'ALL' || item.type === typeFilter),
    [templates, typeFilter],
  );
  const history = useMemo(
    () => templates.filter((item) => selected ? item.type === selected.type : true),
    [templates, selected],
  );

  useEffect(() => {
    if (!selected && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selected]);

  useEffect(() => {
    if (!selected) {
      return;
    }

    setForm({
      name: selected.name ?? '',
      subject: selected.subject ?? '',
      htmlBody: selected.htmlBody ?? '',
      textBody: selected.textBody ?? '',
    });
  }, [selected?.id]);

  const createDraft = useMutation({
    mutationFn: async (payload: { type: EmailTemplateType; name: string; subject: string; htmlBody: string; textBody?: string | null }) =>
      (await api.post<EmailTemplate>('/email-templates', payload)).data,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setSelectedId(created.id);
      push('Draft template berhasil dibuat', 'success');
    },
    onError: (error: any) => push(error?.message ?? 'Gagal membuat draft', 'error'),
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Template belum dipilih');
      return (await api.patch<EmailTemplate>(`/email-templates/${selected.id}`, {
        name: form.name,
        subject: form.subject,
        htmlBody: form.htmlBody,
        textBody: form.textBody || null,
      })).data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setSelectedId(updated.id);
      push('Draft template disimpan', 'success');
    },
    onError: (error: any) => push(error?.message ?? 'Gagal menyimpan draft', 'error'),
  });

  const publish = useMutation({
    mutationFn: async (id: string) => (await api.post<EmailTemplate>(`/email-templates/${id}/publish`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      push('Template berhasil dipublish', 'success');
    },
    onError: (error: any) => push(error?.message ?? 'Gagal publish template', 'error'),
  });

  const rollback = useMutation({
    mutationFn: async (id: string) => (await api.post<EmailTemplate>(`/email-templates/${id}/rollback`)).data,
    onSuccess: (restored) => {
      qc.invalidateQueries({ queryKey: ['email-templates'] });
      setSelectedId(restored.id);
      push('Template berhasil di-rollback', 'success');
    },
    onError: (error: any) => push(error?.message ?? 'Gagal rollback template', 'error'),
  });

  const previewMutation = useMutation({
    mutationFn: async (payload: { id: string; body: { subject?: string; htmlBody?: string; textBody?: string | null } }) =>
      (await api.post<EmailTemplatePreview>(`/email-templates/${payload.id}/preview`, payload.body)).data,
    onSuccess: setPreview,
    onError: () => setPreview(null),
  });

  const sendTest = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Template belum dipilih');
      return (await api.post(`/email-templates/${selected.id}/send-test`, {
        to: sendEmail,
        subject: form.subject,
        htmlBody: form.htmlBody,
        textBody: form.textBody || null,
      })).data;
    },
    onSuccess: () => {
      push('Email test berhasil dikirim', 'success');
      setSendOpen(false);
      setSendEmail('');
    },
    onError: (error: any) => push(error?.message ?? 'Gagal mengirim test email', 'error'),
  });

  const insertToken = (field: keyof FormState, token: string) => {
    const value = `{{${token}}}`;
    const refs: Partial<Record<keyof FormState, RefObject<HTMLTextAreaElement | null>>> = {
      subject: subjectRef,
      htmlBody: htmlRef,
      textBody: textRef,
    };

    const ref = refs[field];
    const el = ref?.current;
    if (!el) {
      return;
    }

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const nextValue = `${el.value.slice(0, start)}${value}${el.value.slice(end)}`;
    setForm((current) => ({ ...current, [field]: nextValue }));
    window.requestAnimationFrame(() => {
      el.focus();
      const cursor = start + value.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  useEffect(() => {
    if (!selected) {
      setPreview(null);
      return;
    }

    const timer = window.setTimeout(() => {
      previewMutation.mutate({
        id: selected.id,
        body: {
          subject: form.subject,
          htmlBody: form.htmlBody,
          textBody: form.textBody || null,
        },
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selected?.id, form.subject, form.htmlBody, form.textBody]);

  const requiredVariables = selected?.requiredVariables ?? [];

  const cloneTemplateToDraft = async (template: EmailTemplate | null) => {
    if (!template) {
      return;
    }

    if (template.status === 'PUBLISHED' && template.isActive) {
      const created = await createDraft.mutateAsync({
        type: template.type,
        name: `${template.name} draft`,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody ?? '',
      });
      setSelectedId(created.id);
      return;
    }

    setSelectedId(template.id);
    push('Silakan ubah isi template di panel editor', 'default');
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="h-eyebrow">Settings / Email Templates</div>
          <h1>Template Email</h1>
          <div className="subtitle">Kelola template transactional Brevo, publish versi baru, dan rollback jika perlu.</div>
        </div>
        <div className="head-actions">
          <Btn
            variant="ghost"
            icon="mail"
            onClick={() => {
              if (!selected) return;
              setSendOpen(true);
            }}
            disabled={!selected}
          >
            Send Test
          </Btn>
          <Btn
            variant="primary"
            icon="plus"
            onClick={() => {
              const type = (selected?.type ?? 'RESET_PASSWORD') as EmailTemplateType;
              createDraft.mutate({
                type,
                name: `${TYPE_LABELS[type]} draft`,
                subject: selected?.subject ?? '',
                htmlBody: selected?.htmlBody ?? '',
                textBody: selected?.textBody ?? '',
              });
            }}
          >
            New Draft
          </Btn>
        </div>
      </div>

      <div className="page-body grid split-side" style={{ gap: 16 }}>
        <Card>
          <CardHead
            title="Template List"
            sub="Semua versi template transactional"
            badge={<Badge variant="mute" naked>{templates.length}</Badge>}
            actions={
              <select
                className="select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as EmailTemplateType | 'ALL')}
                style={{ minWidth: 160 }}
              >
                <option value="ALL">Semua tipe</option>
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                ))}
              </select>
            }
          />
          {templatesQuery.isLoading ? (
            <div className="card-pad muted">Memuat template...</div>
          ) : filtered.length === 0 ? (
            <div className="card-pad">
              <Empty
                icon="mail"
                title="Belum ada template"
                sub="Buat draft pertama untuk memulai."
                action={
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const type = 'RESET_PASSWORD';
                      createDraft.mutate({
                        type,
                        name: `${TYPE_LABELS[type]} draft`,
                        subject: '',
                        htmlBody: '',
                        textBody: '',
                      });
                    }}
                  >
                    Buat Draft
                  </Btn>
                }
              />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 18 }}>Type</th>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th style={{ textAlign: 'right', paddingRight: 18 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const active = item.id === selectedId;
                    return (
                      <tr key={item.id} className={active ? 'selected' : ''} onClick={() => setSelectedId(item.id)} style={{ cursor: 'pointer' }}>
                        <td style={{ paddingLeft: 18 }}>
                          <div style={{ fontWeight: 600 }}>{TYPE_LABELS[item.type]}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{item.name}</div>
                        </td>
                        <td className="mono">{item.version}</td>
                        <td><StatusBadge status={item.status} /></td>
                        <td>{item.isActive ? <Badge variant="ok">Active</Badge> : <Badge variant="mute">No</Badge>}</td>
                        <td style={{ paddingRight: 18 }}>
                          <div className="row tight" style={{ justifyContent: 'flex-end' }}>
                            <Btn size="sm" variant="ghost" icon="edit" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); void cloneTemplateToDraft(item).catch((error) => push(error?.message ?? 'Gagal buat draft', 'error')); }}>
                              Edit
                            </Btn>
                            <Btn size="sm" variant="ghost" icon="eye" onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); }}>
                              View
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="col" style={{ gap: 16 }}>
          <Card>
            <CardHead
              title={selected ? TYPE_LABELS[selected.type] : 'Editor'}
              sub={selected ? `${selected.name} · v${selected.version}` : 'Pilih template untuk mulai edit'}
              badge={selected ? <StatusBadge status={selected.status} /> : undefined}
              actions={selected && (
                <div className="row tight">
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon="copy"
                    onClick={() => cloneTemplateToDraft(selected).catch((error) => push(error?.message ?? 'Gagal buat draft', 'error'))}
                  >
                    Edit
                  </Btn>
                  <Btn
                    size="sm"
                    variant="primary"
                    icon="check"
                    onClick={() => saveDraft.mutate()}
                    loading={saveDraft.isPending}
                    disabled={selected.status === 'PUBLISHED' && selected.isActive}
                  >
                    Save Draft
                  </Btn>
                  <Btn
                    size="sm"
                    variant="accent"
                    icon="zap"
                    onClick={() => publish.mutate(selected.id)}
                    loading={publish.isPending}
                  >
                    Publish
                  </Btn>
                </div>
              )}
            />

            {!selected ? (
              <div className="card-pad">
                <Empty icon="mail" title="Pilih template" sub="Detail template dan preview akan muncul di sini." />
              </div>
            ) : (
              <div className="card-pad col" style={{ gap: 16 }}>
                <Field label="Type" help="Tipe template menentukan variable wajib">
                  <InputWrap icon="mail">
                    <input value={TYPE_LABELS[selected.type]} readOnly />
                  </InputWrap>
                </Field>

                <Field label="Name">
                  <InputWrap icon="edit">
                    <input
                      value={form.name}
                      onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="Nama template"
                    />
                  </InputWrap>
                </Field>

                <Field label="Subject">
                  <div className="editor-shell">
                    <div className="editor-toolbar">
                      {requiredVariables.map((variable) => (
                        <button key={variable} type="button" className="chip" onClick={() => insertToken('subject', variable)}>
                          Insert {variable}
                        </button>
                      ))}
                    </div>
                    <label className="input editor-input">
                      <textarea
                        ref={subjectRef}
                        value={form.subject}
                        onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                        rows={2}
                        placeholder="Subject email"
                      />
                    </label>
                  </div>
                </Field>

                <Field label="HTML Body" help="Gunakan {{variable}}. Script tag diblokir saat publish.">
                  <div className="editor-shell">
                    <div className="editor-toolbar">
                      {requiredVariables.map((variable) => (
                        <button key={variable} type="button" className="chip" onClick={() => insertToken('htmlBody', variable)}>
                          Insert {variable}
                        </button>
                      ))}
                    </div>
                    <label className="input editor-input">
                      <textarea
                        ref={htmlRef}
                        value={form.htmlBody}
                        onChange={(e) => setForm((current) => ({ ...current, htmlBody: e.target.value }))}
                        rows={12}
                        placeholder="HTML body template"
                      />
                    </label>
                  </div>
                </Field>

                <Field label="Text Body">
                  <div className="editor-shell">
                    <div className="editor-toolbar">
                      {requiredVariables.map((variable) => (
                        <button key={variable} type="button" className="chip" onClick={() => insertToken('textBody', variable)}>
                          Insert {variable}
                        </button>
                      ))}
                    </div>
                    <label className="input editor-input">
                      <textarea
                        ref={textRef}
                        value={form.textBody}
                        onChange={(e) => setForm((current) => ({ ...current, textBody: e.target.value }))}
                        rows={6}
                        placeholder="Plain text body"
                      />
                    </label>
                  </div>
                </Field>

                <div className="grid grid-2" style={{ gap: 16 }}>
                  <Card className="preview-card">
                    <CardHead title="Required Variables" sub="Variable wajib per type" />
                    <div className="card-pad">
                      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                        {requiredVariables.map((variable) => (
                          <Badge key={variable} variant="accent">{`{{${variable}}}`}</Badge>
                        ))}
                      </div>
                      {preview?.missingVariables?.length ? (
                        <div className="warn-box" style={{ marginTop: 12 }}>
                          Variable belum dipakai: {preview.missingVariables.join(', ')}
                        </div>
                      ) : (
                        <div className="ok-box" style={{ marginTop: 12 }}>
                          Semua variable wajib sudah dipakai pada template.
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="preview-card">
                    <CardHead title="Preview" sub="Render hasil preview server-side" />
                    <div className="card-pad">
                      <div style={{ marginBottom: 12 }}>
                        <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>Subject</div>
                        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{preview?.subject ?? '...rendering'}</div>
                      </div>
                      <div className="preview-frame">
                        <iframe
                          title="email-preview"
                          srcDoc={preview?.htmlBody ?? '<div style="padding:24px;font-family:Arial">Memuat preview...</div>'}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Card>

          {selected && (
            <Card>
              <CardHead
                title="Version History"
                sub={`History template untuk ${TYPE_LABELS[selected.type]}`}
                badge={<Badge variant="mute" naked>{history.filter((item) => item.type === selected.type).length}</Badge>}
              />
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 18 }}>Version</th>
                      <th>Status</th>
                      <th>Updated</th>
                      <th style={{ textAlign: 'right', paddingRight: 18 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .filter((item) => item.type === selected.type)
                      .map((item) => (
                        <tr key={item.id} className={item.id === selected.id ? 'selected' : ''}>
                          <td style={{ paddingLeft: 18 }}>
                            <div style={{ fontWeight: 600 }}>v{item.version}</div>
                            <div className="muted" style={{ fontSize: 11.5 }}>{item.name}</div>
                          </td>
                          <td><StatusBadge status={item.status} /></td>
                          <td className="muted">{formatDate(item.updatedAt)}</td>
                          <td style={{ paddingRight: 18 }}>
                            <div className="row tight" style={{ justifyContent: 'flex-end' }}>
                              <Btn size="sm" variant="ghost" icon="eye" onClick={() => setSelectedId(item.id)}>View</Btn>
                              <Btn size="sm" variant="ghost" icon="zap" onClick={() => publish.mutate(item.id)}>Publish</Btn>
                              <Btn size="sm" variant="ghost" icon="refresh" onClick={() => rollback.mutate(item.id)}>Rollback</Btn>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send Test Email"
        footer={
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setSendOpen(false)}>Batal</Btn>
            <Btn
              variant="primary"
              icon="send"
              onClick={() => sendTest.mutate()}
              loading={sendTest.isPending}
              disabled={!sendEmail}
            >
              Kirim Test
            </Btn>
          </div>
        }
      >
        <Field label="Email tujuan" help="Akan menerima template yang sedang dipilih">
          <InputWrap icon="mail">
            <input
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              placeholder="nama@domain.com"
            />
          </InputWrap>
        </Field>
      </Modal>
    </>
  );
}
