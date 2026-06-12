import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Users, Link2, Check } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Guest, GuestInput } from '../lib/api';
import { RSVP_LABELS, RSVP_COLORS, SIDE_LABELS } from '../lib/constants';
import { getGuestInviteUrl } from '../lib/invite';
import { formatGuestFullName, formatGuestNames, getInviteGuest } from '../lib/guestNames';
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

const emptySpouse = {
  firstName: '',
  lastName: '',
  phone: '',
  notes: '',
};

const emptyFamilyMember = {
  firstName: '',
  lastName: '',
};

export function GuestsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState({ total: 0, bride: 0, groom: 0 });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [form, setForm] = useState<GuestInput>(emptyForm);
  const [addSpouse, setAddSpouse] = useState(false);
  const [spouseForm, setSpouseForm] = useState(emptySpouse);
  const [addFamily, setAddFamily] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([{ ...emptyFamilyMember }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'BRIDE' | 'GROOM'>('ALL');
  const [copiedGuestId, setCopiedGuestId] = useState<string | null>(null);

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
    setAddSpouse(false);
    setSpouseForm(emptySpouse);
    setAddFamily(false);
    setFamilyMembers([{ ...emptyFamilyMember }]);
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
        const payload: GuestInput = { ...form };
        if (addSpouse) {
          payload.spouse = {
            firstName: spouseForm.firstName,
            lastName: spouseForm.lastName || undefined,
            phone: spouseForm.phone || undefined,
            rsvp: form.rsvp,
            notes: spouseForm.notes || undefined,
          };
        }
        if (addFamily) {
          payload.familyMembers = familyMembers
            .filter((member) => member.firstName.trim())
            .map((member) => ({
              firstName: member.firstName.trim(),
              lastName: member.lastName.trim() || undefined,
            }));
        }
        await api.guests.create(projectId, payload);
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
    if (!projectId || !confirm(`Ջնջե՞լ ${formatGuestFullName(guest)}-ին`)) return;
    await api.guests.delete(projectId, guest.id);
    load();
  };

  const copyInviteLink = async (guest: Guest) => {
    try {
      await navigator.clipboard.writeText(getGuestInviteUrl(guest.inviteToken));
      setCopiedGuestId(guest.id);
      setTimeout(() => setCopiedGuestId(null), 2000);
    } catch {
      alert('Չհաջողվեց պատճենել link-ը');
    }
  };

  const filtered = guests.filter((g) => filter === 'ALL' || g.side === filter);
  const guestById = new Map(guests.map((guest) => [guest.id, guest]));

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
                  <th className="p-4 font-medium">Հրավերի հղում</th>
                  <th className="p-4 font-medium text-right">Գործողություն</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((guest) => {
                  const inviteGuest = getInviteGuest(guest, guestById);
                  const displayName = guest.parentId
                    ? formatGuestFullName(guest)
                    : formatGuestNames(guest, guest.partner, guest.children);

                  return (
                  <tr key={guest.id} className="border-b border-rose-50 hover:bg-rose-50/50">
                    <td className="p-4 font-medium text-rose-900">
                      {displayName}
                      {guest.partner && !guest.parentId && (
                        <span className="ml-2 text-xs font-normal text-rose-400">(զույգ)</span>
                      )}
                      {guest.parentId && (
                        <span className="ml-2 text-xs font-normal text-rose-400">(երեխա)</span>
                      )}
                      {!!guest.children?.length && (
                        <span className="ml-2 text-xs font-normal text-rose-400">
                          (ընտանիք · {guest.children.length})
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-rose-600 hidden sm:table-cell">{guest.phone || '—'}</td>
                    <td className="p-4 text-rose-600">{SIDE_LABELS[guest.side]}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${RSVP_COLORS[guest.rsvp]}`}>
                        {RSVP_LABELS[guest.rsvp]}
                      </span>
                    </td>
                    <td className="p-4">
                      {inviteGuest?.inviteToken ? (
                        <div className="flex flex-col gap-1.5 max-w-[240px]">
                          <a
                            href={getGuestInviteUrl(inviteGuest.inviteToken)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-rose-600 hover:text-rose-800 hover:underline break-all leading-relaxed"
                          >
                            {getGuestInviteUrl(inviteGuest.inviteToken)}
                          </a>
                          <button
                            type="button"
                            onClick={() => copyInviteLink(inviteGuest)}
                            className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 w-fit"
                          >
                            {copiedGuestId === guest.id ? (
                              <>
                                <Check size={12} />
                                Պատճենված է
                              </>
                            ) : (
                              <>
                                <Link2 size={12} />
                                Պատճենել link-ը
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-rose-400">—</span>
                      )}
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
                  );
                })}
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
            <Input label="Ազգանուն" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
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

          {!editing && (
            <div className="space-y-3 rounded-xl border border-rose-100 p-4 bg-rose-50/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addSpouse}
                  onChange={(e) => setAddSpouse(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600"
                />
                <span className="text-sm font-medium text-rose-800">Ավելացնել նաև ամուսնուն/կնոջը</span>
              </label>

              {addSpouse && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-rose-500">Կիսվի նույն կողմից և RSVP կարգավիճակով</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Անուն"
                      value={spouseForm.firstName}
                      onChange={(e) => setSpouseForm({ ...spouseForm, firstName: e.target.value })}
                      required={addSpouse}
                    />
                    <Input
                      label="Ազգանուն"
                      value={spouseForm.lastName}
                      onChange={(e) => setSpouseForm({ ...spouseForm, lastName: e.target.value })}
                    />
                  </div>
                  <Input
                    label="Հեռախոս"
                    value={spouseForm.phone}
                    onChange={(e) => setSpouseForm({ ...spouseForm, phone: e.target.value })}
                  />
                  <Input
                    label="Նշումներ"
                    value={spouseForm.notes}
                    onChange={(e) => setSpouseForm({ ...spouseForm, notes: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {!editing && (
            <div className="space-y-3 rounded-xl border border-rose-100 p-4 bg-rose-50/50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addFamily}
                  onChange={(e) => setAddFamily(e.target.checked)}
                  className="rounded border-rose-300 text-rose-600"
                />
                <span className="text-sm font-medium text-rose-800">Ավելացնել ընտանիք (երեխաներ)</span>
              </label>

              {addFamily && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-rose-500">Երեխաների համար բավական է միայն անունը</p>
                  {familyMembers.map((member, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <Input
                        label={index === 0 ? 'Երեխայի անուն' : `Երեխա ${index + 1}`}
                        value={member.firstName}
                        onChange={(e) => {
                          const next = [...familyMembers];
                          next[index] = { ...next[index], firstName: e.target.value };
                          setFamilyMembers(next);
                        }}
                        required={addFamily && index === 0}
                      />
                      <Input
                        label="Ազգանուն"
                        value={member.lastName}
                        onChange={(e) => {
                          const next = [...familyMembers];
                          next[index] = { ...next[index], lastName: e.target.value };
                          setFamilyMembers(next);
                        }}
                      />
                      {familyMembers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFamilyMembers(familyMembers.filter((_, i) => i !== index))}
                          className="mb-2 p-2 rounded-lg hover:bg-rose-100 text-rose-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setFamilyMembers([...familyMembers, { ...emptyFamilyMember }])}
                  >
                    <Plus size={14} /> Ավելացնել երեխա
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Պահպանել</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
