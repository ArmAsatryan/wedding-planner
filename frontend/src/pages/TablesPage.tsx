import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Table2, Wand2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { SeatingTable, Guest, TableInput } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';

export function TablesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tables, setTables] = useState<SeatingTable[]>([]);
  const [unassigned, setUnassigned] = useState<Guest[]>([]);
  const [stats, setStats] = useState({ tableCount: 0, totalSeats: 0, occupiedSeats: 0, emptySeats: 0, unassignedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [tableModal, setTableModal] = useState(false);
  const [autoModal, setAutoModal] = useState(false);
  const [editing, setEditing] = useState<SeatingTable | null>(null);
  const [tableForm, setTableForm] = useState<TableInput>({ name: '', capacity: 8 });
  const [selectedGuests, setSelectedGuests] = useState<string[]>([]);
  const [peoplePerTable, setPeoplePerTable] = useState(8);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.tables.list(projectId).then((res) => {
      setTables(res.tables);
      setUnassigned(res.unassignedGuests);
      setStats(res.stats);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.tables.update(projectId, editing.id, tableForm);
      } else {
        await api.tables.create(projectId, tableForm);
      }
      setTableModal(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || selectedGuests.length === 0) {
      setError('Ընտրեք առնվազն մեկ հյուր');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.tables.autoDistribute(projectId, {
        guestIds: selectedGuests,
        peoplePerTable,
        tableNamePrefix: 'Սեղան',
      });
      setAutoModal(false);
      setSelectedGuests([]);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (tableId: string, guestId: string) => {
    if (!projectId) return;
    try {
      await api.tables.assign(projectId, tableId, guestId);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    }
  };

  const handleUnassign = async (tableId: string, guestId: string) => {
    if (!projectId) return;
    await api.tables.unassign(projectId, tableId, guestId);
    load();
  };

  const handleDeleteTable = async (table: SeatingTable) => {
    if (!projectId || !confirm(`Ջնջե՞լ «${table.name}» սեղանը`)) return;
    await api.tables.delete(projectId, table.id);
    load();
  };

  const toggleGuest = (id: string) => {
    setSelectedGuests((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const allGuestsForAuto = [...unassigned, ...tables.flatMap((t) => t.guests.map((g) => g.guest))];
  const uniqueGuests = Array.from(new Map(allGuestsForAuto.map((g) => [g.id, g])).values());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-rose-900">Սեղանների պլանավորում</h1>
          <p className="text-rose-500 text-sm mt-1">Կազմակերպեք հյուրերի նստատեղերը</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setAutoModal(true); setError(''); }}>
            <Wand2 size={18} /> Ավտոմատ բաշխում
          </Button>
          <Button onClick={() => { setEditing(null); setTableForm({ name: '', capacity: 8 }); setTableModal(true); }}>
            <Plus size={18} /> Նոր սեղան
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Սեղաններ" value={stats.tableCount} icon={<Table2 size={24} />} />
        <StatCard label="Ընդամենը տեղեր" value={stats.totalSeats} />
        <StatCard label="Դատարկ տեղեր" value={stats.emptySeats} variant="warning" />
        <StatCard label="Չբաշխված" value={stats.unassignedCount} variant={stats.unassignedCount > 0 ? 'warning' : 'success'} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
        </div>
      ) : tables.length === 0 ? (
        <EmptyState
          icon={<Table2 size={48} />}
          title="Սեղաններ չկան"
          description="Ստեղծեք սեղաններ կամ օգտագործեք ավտոմատ բաշխում"
          action={
            <Button onClick={() => setTableModal(true)}>
              <Plus size={18} /> Ստեղծել սեղան
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardHeader
                title={table.name}
                subtitle={`${table.guests.length} / ${table.capacity} տեղ`}
                action={
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEditing(table); setTableForm({ name: table.name, capacity: table.capacity }); setTableModal(true); }}
                      className="p-2 rounded-lg hover:bg-rose-100 text-rose-600"
                    >
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDeleteTable(table)} className="p-2 rounded-lg hover:bg-red-100 text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                }
              />
              <CardBody className="space-y-2">
                {table.guests.map(({ guest }) => (
                  <div key={guest.id} className="flex items-center justify-between p-2 rounded-lg bg-rose-50">
                    <span className="text-sm text-rose-800">{guest.firstName} {guest.lastName}</span>
                    <button onClick={() => handleUnassign(table.id, guest.id)} className="text-xs text-red-500 hover:underline">
                      Հանել
                    </button>
                  </div>
                ))}
                {table.guests.length < table.capacity && unassigned.length > 0 && (
                  <select
                    className="w-full mt-2 rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-700"
                    value=""
                    onChange={(e) => { if (e.target.value) handleAssign(table.id, e.target.value); }}
                  >
                    <option value="">+ Ավելացնել հյուր</option>
                    {unassigned.map((g) => (
                      <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                    ))}
                  </select>
                )}
                {Array.from({ length: table.capacity - table.guests.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2 rounded-lg border border-dashed border-rose-200 text-xs text-rose-300 text-center">
                    Դատարկ տեղ
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {unassigned.length > 0 && (
        <Card>
          <CardHeader title="Չբաշխված հյուրեր" subtitle={`${unassigned.length} հյուր`} />
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((g) => (
                <span key={g.id} className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-sm border border-amber-200">
                  {g.firstName} {g.lastName}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal open={tableModal} onClose={() => setTableModal(false)} title={editing ? 'Խմբագրել սեղանը' : 'Նոր սեղան'}>
        <form onSubmit={handleSaveTable} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}
          <Input label="Սեղանի անուն" value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} required />
          <Input label="Տեղերի քանակ" type="number" min="1" value={tableForm.capacity} onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })} required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTableModal(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Պահպանել</Button>
          </div>
        </form>
      </Modal>

      <Modal open={autoModal} onClose={() => setAutoModal(false)} title="Ավտոմատ բաշխում" size="lg">
        <form onSubmit={handleAutoDistribute} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}
          <Input label="Մարդ սեղանին" type="number" min="1" value={peoplePerTable} onChange={(e) => setPeoplePerTable(Number(e.target.value))} required />
          <div>
            <p className="text-sm font-medium text-rose-800 mb-2">Ընտրեք հյուրեր</p>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-rose-100 rounded-xl p-3">
              {uniqueGuests.map((g) => (
                <label key={g.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-rose-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedGuests.includes(g.id)}
                    onChange={() => toggleGuest(g.id)}
                    className="rounded border-rose-300 text-rose-600"
                  />
                  <span className="text-sm text-rose-800">{g.firstName} {g.lastName}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAutoModal(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Բաշխել</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
