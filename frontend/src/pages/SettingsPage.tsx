import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus, Trash2, Settings } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { MembersResponse, ProjectInput } from '../lib/api';
import { ROLE_LABELS } from '../lib/constants';
import { formatDate, toInputDate } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';

export function SettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [members, setMembers] = useState<MembersResponse | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectInput>({
    brideName: '',
    groomName: '',
    weddingDate: '',
    totalBudget: 0,
  });
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      api.members.list(projectId),
      api.projects.get(projectId),
    ]).then(([mem, proj]) => {
      setMembers(mem);
      setUserRole(proj.userRole);
      setProjectForm({
        brideName: proj.brideName,
        groomName: proj.groomName,
        weddingDate: toInputDate(proj.weddingDate),
        totalBudget: proj.totalBudget,
      });
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const canEdit = userRole === 'OWNER' || userRole === 'EDITOR';
  const isOwner = userRole === 'OWNER';

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.projects.update(projectId, projectForm);
      setMessage('Նախագիծը պահպանված է');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError('');
    try {
      await api.members.invite(projectId, { email: inviteEmail, role: inviteRole });
      setInviteModal(false);
      setInviteEmail('');
      setMessage('Խմբագիրը հրավիրված է');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId || !confirm('Հեռացնե՞լ այս խմբագիրին')) return;
    await api.members.remove(projectId, memberId);
    load();
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeleting(true);
    setError('');
    try {
      await api.projects.delete(projectId);
      navigate('/projects');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ջնջումը ձախողվեց');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-rose-900">Կարգավորումներ</h1>
        <p className="text-rose-500 text-sm mt-1">Կառավարեք նախագիծը և համահեղինակներին</p>
      </div>

      {message && (
        <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3">{message}</div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <Card>
        <CardHeader title="Հարսանիքի տվյալներ" subtitle="Հիմնական տեղեկություն" />
        <CardBody>
          <form onSubmit={handleSaveProject} className="space-y-4 max-w-lg">
            <Input
              label="Հարսի անուն"
              value={projectForm.brideName}
              onChange={(e) => setProjectForm({ ...projectForm, brideName: e.target.value })}
              required
              disabled={!canEdit}
            />
            <Input
              label="Փեսայի անուն"
              value={projectForm.groomName}
              onChange={(e) => setProjectForm({ ...projectForm, groomName: e.target.value })}
              required
              disabled={!canEdit}
            />
            <Input
              label="Հարսանիքի ամսաթիվ"
              type="date"
              value={projectForm.weddingDate}
              onChange={(e) => setProjectForm({ ...projectForm, weddingDate: e.target.value })}
              required
              disabled={!canEdit}
            />
            <Input
              label="Ընդհանուր բյուջե (դրամ)"
              type="number"
              min="0"
              value={projectForm.totalBudget}
              onChange={(e) => setProjectForm({ ...projectForm, totalBudget: Number(e.target.value) })}
              required
              disabled={!canEdit}
            />
            {canEdit && (
              <Button type="submit" loading={saving}>Պահպանել</Button>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Համահեղինակներ"
          subtitle="Հրավիրեք այլ մարդկանց դիտելու և խմբագրելու համար"
          action={
            isOwner && (
              <Button size="sm" onClick={() => { setInviteModal(true); setError(''); }}>
                <UserPlus size={16} /> Հրավիրել
              </Button>
            )
          }
        />
        <CardBody className="space-y-3">
          {members && (
            <>
              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50">
                <div>
                  <p className="font-medium text-rose-900">{members.owner.name}</p>
                  <p className="text-sm text-rose-500">{members.owner.email}</p>
                </div>
                <span className="text-xs font-medium bg-rose-200 text-rose-800 px-2.5 py-1 rounded-full">
                  {ROLE_LABELS.OWNER}
                </span>
              </div>
              {members.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-rose-100">
                  <div>
                    <p className="font-medium text-rose-900">{m.user.name}</p>
                    <p className="text-sm text-rose-500">{m.user.email}</p>
                    <p className="text-xs text-rose-400 mt-0.5">
                      Հրավիրված՝ {formatDate(m.invitedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full">
                      {ROLE_LABELS[m.role]}
                    </span>
                    {isOwner && (
                      <button onClick={() => handleRemoveMember(m.id)} className="p-2 rounded-lg hover:bg-red-100 text-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {members.members.length === 0 && (
                <p className="text-sm text-rose-400 text-center py-4">
                  <Settings size={20} className="inline mr-1 opacity-50" />
                  Դեռ համահեղինակներ չկան
                </p>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {isOwner && (
        <Card className="border-red-200">
          <CardHeader title="Նախագիծը ջնջել" subtitle="Անդարձելի գործողություն" />
          <CardBody>
            <p className="text-sm text-stone-600 mb-4">
              Նախագիծը ջնջելու դեպքում բոլոր տվյալները կկորչեն։
            </p>
            <Button variant="danger" size="sm" onClick={() => { setDeleteModal(true); setError(''); }}>
              <Trash2 size={14} />
              Ջնջել նախագիծ
            </Button>
          </CardBody>
        </Card>
      )}

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Ջնջել նախագիծ" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Վստա՞հ եք, որ ցանկանում եք ջնջել այս նախագիծը։
          </p>
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} className="flex-1">Չեղարկել</Button>
            <Button variant="danger" onClick={handleDeleteProject} loading={deleting} className="flex-1">Ջնջել</Button>
          </div>
        </div>
      </Modal>

      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Հրավիրել խմբագիր">
        <form onSubmit={handleInvite} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}
          <Input
            label="Էլ. փոստ"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            placeholder="example@email.com"
          />
          <Select label="Դեր" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')}>
            <option value="EDITOR">Խմբագիր — կարող է խմբագրել</option>
            <option value="VIEWER">Դիտորդ — միայն դիտում</option>
          </Select>
          <p className="text-xs text-rose-400">
            Օգտատերը պետք է նախ գրանցված լինի հավելվածում
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setInviteModal(false)} className="flex-1">Չեղարկել</Button>
            <Button type="submit" loading={saving} className="flex-1">Հրավիրել</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
