import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Guest, GuestInput } from '../lib/api';
import { RSVP_LABELS, RSVP_COLORS, SIDE_LABELS } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';

const emptyForm: GuestInput = {
  firstName: '',
  lastName: '',
  phone: '',
  side: 'BRIDE',
  rsvp: 'INVITED',
  notes: '',
};

export function GuestsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState({ total: 0, bride: 0, groom: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState<GuestInput>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'BRIDE' | 'GROOM'>('ALL');

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.guests.list(projectId).then((res) => {
      setGuests(res.guests);
      setStats(res.stats);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (guest: Guest) => {
    setEditing(guest);
    setForm({
      firstName: guest.firstName,
      lastName: guest.lastName,
      phone: guest.phone || '',
      side: guest.side,
      rsvp: guest.rsvp,
      notes: guest.notes || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.guests.update(projectId, editing.id, form);
      } else {
        await api.guests.create(projectId, form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (guest: Guest) => {
    if (!projectId || !confirm(`Ջնջե՞լ ${guest.firstName} ${guest.lastName}-ին`)) return;
    await api.guests.delete(projectId, guest.id);
    load();
  };

  const filtered = guests.filter((g) => filter === 'ALL' || g.side === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-rose-900">Հյուրերի կառավարում</h1>
          <p className="text-rose-500 text-sm mt-1">Ավելացրեք և կառավարեք հյուրերի ցանկը</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} /> Ավելացնել հյուր</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ընդամենը" value={stats.total} icon={<Users size={24} />} />
        <StatCard label="Հարսի կողմ" value={stats.bride} />
        <StatCard label="Փեսայի կողմ" value={stats.groom} />
      </div>

      <div className="flex gap-2">
        {(['ALL', 'BRIDE', 'GROOM'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? 'bg-rose-600 text-white' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            {f === 'ALL' ? 'Բոլորը' : SIDE_LABELS[f]}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={48} />}
            title="Հյուրեր չկան"
            description="Ավելացրեք առաջին հյուրը"
            action={<Button onClick={openCreate}><Plus size={18} /> Ավելացնել</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-100 text-left text-rose-500">
                  <th className="p-4 font-medium">Անուն</th>
                  <th className="p-4 font-medium hidden sm:table-cell">Հեռախոս</th>
                  <th className="p-4 font-medium">Կողմ</th>
                  <th className="p-4 font-medium">RSVP</th>
                  <th className="p-4 font-medium text-right">Գործողություն</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((guest) => (
                  <tr key={guest.id} className="border-b border-rose-50 hover:bg-rose-50/50">
                    <td className="p-4 font-medium text-rose-900">{guest.firstName} {guest.lastName}</td>
                    <td className="p-4 text-rose-600 hidden sm:table-cell">{guest.phone || '—'}</td>
                    <td className="p-4 text-rose-600">{SIDE_LABELS[guest.side]}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${RSVP_COLORS[guest.rsvp]}`}>
                        {RSVP_LABELS[guest.rsvp]}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(guest)} className="p-2 rounded-lg hover:bg-rose-100 text-rose-600">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(guest)} className="p-2 rounded-lg hover:bg-red-100 text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Խմբագրել հյուրը' : 'Նոր հյուր'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Անուն" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            <Input label="Ազգանուն" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <Input label="Հեռախոս" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Կողմ" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as 'BRIDE' | 'GROOM' })}>
            <option value="BRIDE">Հարսի կողմ</option>
            <option value="GROOM">Փեսայի կողմ</option>
          </Select>
          <Select label="RSVP կարգավիճակ" value={form.rsvp} onChange={(e) => setForm({ ...form, rsvp: e.target.value })}>
            {Object.entries(RSVP_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input label="Նշումներ" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Պահպանել</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
