import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { ScheduleItem, ScheduleInput } from '../lib/api';
import { formatTime, toInputTime, combineDateAndTime, formatDate } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';

const emptyForm: ScheduleInput = {
  title: '',
  startTime: '',
  endTime: '',
  locationName: '',
  address: '',
  description: '',
  mapLink: '',
};

export function SchedulePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [form, setForm] = useState<ScheduleInput>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      api.schedule.list(projectId),
      api.projects.get(projectId),
    ])
      .then(([scheduleItems, project]) => {
        setItems(scheduleItems);
        setWeddingDate(project.weddingDate);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item: ScheduleItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      startTime: toInputTime(item.startTime),
      endTime: item.endTime ? toInputTime(item.endTime) : '',
      locationName: item.locationName,
      address: item.address,
      description: item.description || '',
      mapLink: item.mapLink || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !weddingDate) return;
    setSaving(true);
    setError('');
    try {
      const data: ScheduleInput = {
        ...form,
        startTime: combineDateAndTime(weddingDate, form.startTime),
        endTime: form.endTime ? combineDateAndTime(weddingDate, form.endTime) : null,
      };
      if (editing) {
        await api.schedule.update(projectId, editing.id, data);
      } else {
        await api.schedule.create(projectId, data);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ScheduleItem) => {
    if (!projectId || !confirm(`Ջնջե՞լ «${item.title}»-ը`)) return;
    await api.schedule.delete(projectId, item.id);
    load();
  };

  const getMapUrl = (item: ScheduleItem) => {
    if (item.mapLink) return item.mapLink;
    if (item.latitude && item.longitude) {
      return `https://maps.google.com/?q=${item.latitude},${item.longitude}`;
    }
    return `https://maps.google.com/?q=${encodeURIComponent(item.address)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-rose-900">Հարսանիքի ժամանակացույց</h1>
          <p className="text-rose-500 text-sm mt-1">
            {weddingDate
              ? `Հարսանիքի օրը՝ ${formatDate(weddingDate)} — բոլոր միջոցառումները այս օրվա են`
              : 'Պլանավորեք հարսանիքի օրվա ծրագիրը'}
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={18} /> Ավելացնել կետ</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} />}
          title="Ժամանակացույց դատարկ է"
          description="Ավելացրեք հարսանիքի օրվա միջոցառումները"
          action={<Button onClick={openCreate}><Plus size={18} /> Ավելացնել</Button>}
        />
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-rose-200 hidden md:block" />
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="relative md:pl-16">
                <div className="absolute left-4 top-6 w-4 h-4 rounded-full bg-rose-500 border-4 border-white shadow hidden md:block" />
                <Card>
                  <CardBody>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-rose-400 bg-rose-50 px-2 py-0.5 rounded-full">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-semibold text-rose-600">
                            {formatTime(item.startTime)}
                            {item.endTime && ` — ${formatTime(item.endTime)}`}
                          </span>
                        </div>
                        <h3 className="font-serif text-lg font-bold text-rose-900 mb-2">{item.title}</h3>
                        <div className="flex items-start gap-2 text-sm text-rose-600 mb-1">
                          <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-medium">{item.locationName}</p>
                            <p className="text-rose-400">{item.address}</p>
                          </div>
                        </div>
                        {item.description && (
                          <p className="text-sm text-rose-500 mt-2">{item.description}</p>
                        )}
                        <a
                          href={getMapUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-rose-600 hover:underline mt-2"
                        >
                          <ExternalLink size={14} />
                          Բացել քարտեզում
                        </a>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-rose-100 text-rose-600">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-2 rounded-lg hover:bg-red-100 text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Խմբագրել' : 'Նոր միջոցառում'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}
          <Input label="Վերնագիր" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Սկիզբ" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            <Input label="Ավարտ (ընտրովի)" type="time" value={form.endTime || ''} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <Input label="Վայրի անուն" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} required />
          <Input label="Հասցե" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <Input label="Google Maps հղում" value={form.mapLink} onChange={(e) => setForm({ ...form, mapLink: e.target.value })} placeholder="https://maps.google.com/..." />
          <Textarea label="Նկարագրություն" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Պահպանել</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
