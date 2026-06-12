import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Wallet, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Expense, ExpenseInput } from '../lib/api';
import { EXPENSE_CATEGORIES, PAYMENT_LABELS } from '../lib/constants';
import { formatCurrency } from '../lib/format';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select, Textarea } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { StatCard } from '../components/ui/StatCard';

const emptyForm: ExpenseInput = {
  name: '',
  category: 'OTHER',
  amount: 0,
  paymentStatus: 'UNPAID',
  description: '',
};

export function ExpensesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0, remainingBudget: 0, exceedsBudget: false });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseInput>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.expenses.list(projectId).then((res) => {
      setExpenses(res.expenses);
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

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      name: expense.name,
      category: expense.category,
      amount: expense.amount,
      paymentStatus: expense.paymentStatus,
      description: expense.description || '',
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
        await api.expenses.update(projectId, editing.id, form);
      } else {
        await api.expenses.create(projectId, form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!projectId || !confirm(`Ջնջե՞լ «${expense.name}» ծախսը`)) return;
    await api.expenses.delete(projectId, expense.id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-rose-900">Ծախսերի կառավարում</h1>
          <p className="text-rose-500 text-sm mt-1">Հետևեք հարսանիքի բյուջեին և ծախսերին</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} /> Ավելացնել ծախս</Button>
      </div>

      {stats.exceedsBudget && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          <AlertTriangle size={20} />
          <span className="text-sm font-medium">Ծախսերը գերազանցում են բյուջեն {formatCurrency(Math.abs(stats.remainingBudget))}-ով!</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ընդամենը" value={formatCurrency(stats.total)} icon={<Wallet size={24} />} />
        <StatCard label="Վճարված" value={formatCurrency(stats.paid)} variant="success" />
        <StatCard label="Չվճարված" value={formatCurrency(stats.unpaid)} variant="warning" />
        <StatCard
          label="Մնացորդ"
          value={formatCurrency(stats.remainingBudget)}
          variant={stats.exceedsBudget ? 'danger' : 'success'}
        />
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<Wallet size={48} />}
            title="Ծախսեր չկան"
            description="Ավելացրեք առաջին ծախսը"
            action={<Button onClick={openCreate}><Plus size={18} /> Ավելացնել</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-100 text-left text-rose-500">
                  <th className="p-4 font-medium">Անվանում</th>
                  <th className="p-4 font-medium">Կատեգորիա</th>
                  <th className="p-4 font-medium">Գումար</th>
                  <th className="p-4 font-medium">Կարգավիճակ</th>
                  <th className="p-4 font-medium text-right">Գործողություն</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-rose-50 hover:bg-rose-50/50">
                    <td className="p-4">
                      <p className="font-medium text-rose-900">{expense.name}</p>
                      {expense.description && <p className="text-xs text-rose-400 mt-0.5">{expense.description}</p>}
                    </td>
                    <td className="p-4 text-rose-600">{EXPENSE_CATEGORIES[expense.category]}</td>
                    <td className="p-4 font-semibold text-rose-900">{formatCurrency(expense.amount)}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expense.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {PAYMENT_LABELS[expense.paymentStatus]}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(expense)} className="p-2 rounded-lg hover:bg-rose-100 text-rose-600">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(expense)} className="p-2 rounded-lg hover:bg-red-100 text-red-600">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Խմբագրել ծախսը' : 'Նոր ծախս'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}
          <Input label="Անվանում" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Կատեգորիա" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <Input label="Գումար (դրամ)" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
          <Select label="Վճարման կարգավիճակ" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
            <option value="PAID">Վճարված</option>
            <option value="UNPAID">Չվճարված</option>
          </Select>
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
