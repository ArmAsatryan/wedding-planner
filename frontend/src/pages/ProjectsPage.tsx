import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, LogOut, Trash2, MoreHorizontal } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { ProjectListItem } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../lib/format';

export function ProjectsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    brideName: '',
    groomName: '',
    weddingDate: '',
    totalBudget: '',
  });

  const load = () => {
    setLoading(true);
    api.projects.list().then(setProjects).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const project = await api.projects.create({
        brideName: form.brideName,
        groomName: form.groomName,
        weddingDate: form.weddingDate,
        totalBudget: Number(form.totalBudget),
      });
      setModalOpen(false);
      setForm({ brideName: '', groomName: '', weddingDate: '', totalBudget: '' });
      navigate(`/projects/${project.id}/dashboard`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await api.projects.delete(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ջնջումը ձախողվեց');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-sm font-medium text-stone-900">Նախագծեր</h1>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              Նոր
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { logout(); navigate('/login'); }}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<Calendar size={40} />}
            title="Նախագիծ չկա"
            description="Ստեղծեք նոր հարսանիքի նախագիծ"
            action={
              <Button onClick={() => setModalOpen(true)}>
                <Plus size={16} />
                Ստեղծել
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="group hover:border-stone-300 transition-colors"
              >
                <CardBody className="py-4">
                  <div className="flex items-center gap-4">
                    <button
                      className="flex-1 text-left min-w-0"
                      onClick={() => navigate(`/projects/${p.id}/dashboard`)}
                    >
                      <h2 className="font-medium text-stone-900 truncate">
                        {p.brideName} & {p.groomName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(p.weddingDate)}
                        </span>
                        <span>{p.summary.guests.total} հյուր</span>
                        <span>{formatCurrency(p.summary.budget.remaining)} մնացորդ</span>
                      </div>
                    </button>
                    {p.userRole === 'OWNER' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); setError(''); }}
                        className="p-2 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Ջնջել նախագիծ"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/projects/${p.id}/dashboard`)}
                      className="p-2 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Նոր նախագիծ">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <Input label="Հարսի անուն" value={form.brideName} onChange={(e) => setForm({ ...form, brideName: e.target.value })} required />
          <Input label="Փեսայի անուն" value={form.groomName} onChange={(e) => setForm({ ...form, groomName: e.target.value })} required />
          <Input label="Ամսաթիվ" type="date" value={form.weddingDate} onChange={(e) => setForm({ ...form, weddingDate: e.target.value })} required />
          <Input label="Բյուջե (դրամ)" type="number" min="0" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} required />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Ստեղծել</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Ջնջել նախագիծ" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Վստա՞հ եք, որ ցանկանում եք ջնջել <strong>{deleteTarget?.brideName} & {deleteTarget?.groomName}</strong> նախագիծը։
            Այս գործողությունը հնարավոր չէ հետարկել։
          </p>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Ջնջել</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
