import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Users, Wallet, Calendar, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import type { DashboardData } from '../lib/api';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { formatCurrency, formatDate, formatTime } from '../lib/format';

export function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    api.projects.dashboard(projectId).then(setData).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 pb-6">
        <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Հարսանիք</p>
        <h1 className="font-serif text-2xl md:text-3xl font-medium text-stone-900 mb-1">
          {data.brideName} & {data.groomName}
        </h1>
        <p className="text-sm text-stone-500">{formatDate(data.weddingDate)}</p>
      </div>

      {summary.budget.exceedsBudget && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3">
          <AlertTriangle size={20} />
          <span className="text-sm font-medium">Զգուշացում՝ ծախսերը գերազանցում են բյուջեն!</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ընդհանուր բյուջե" value={formatCurrency(summary.budget.total)} icon={<Wallet size={24} />} />
        <StatCard label="Օգտագործված" value={formatCurrency(summary.budget.used)} variant="warning" />
        <StatCard
          label="Մնացորդ"
          value={formatCurrency(summary.budget.remaining)}
          variant={summary.budget.exceedsBudget ? 'danger' : 'success'}
        />
        <StatCard
          label="Հյուրեր"
          value={summary.guests.total}
          subtitle={`${summary.guests.confirmed} հաստատված`}
          icon={<Users size={24} />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader title="Ծախսերի ամփոփում" />
          <CardBody className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Ընդամենը</span>
              <span className="font-semibold">{formatCurrency(summary.expenses.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Վճարված</span>
              <span className="font-semibold text-green-700">{formatCurrency(summary.expenses.paid)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Չվճարված</span>
              <span className="font-semibold text-amber-700">{formatCurrency(summary.expenses.unpaid)}</span>
            </div>
            <Link to={`/projects/${projectId}/expenses`} className="text-sm text-stone-600 hover:underline block pt-2">
              Դիտել բոլոր ծախսերը →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Սեղանների ամփոփում" />
          <CardBody className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Սեղաններ</span>
              <span className="font-semibold">{summary.tables.count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Դատարկ տեղեր</span>
              <span className="font-semibold">{summary.tables.emptySeats}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Չբաշխված հյուրեր</span>
              <span className="font-semibold text-amber-700">{summary.tables.unassignedGuests}</span>
            </div>
            <Link to={`/projects/${projectId}/tables`} className="text-sm text-stone-600 hover:underline block pt-2">
              Կառավարել սեղանները →
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Հյուրերի ամփոփում" />
          <CardBody className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Հարսի կողմ</span>
              <span className="font-semibold">{summary.guests.bride}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Փեսայի կողմ</span>
              <span className="font-semibold">{summary.guests.groom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Հաստատված</span>
              <span className="font-semibold text-green-700">{summary.guests.confirmed}</span>
            </div>
            <Link to={`/projects/${projectId}/guests`} className="text-sm text-stone-600 hover:underline block pt-2">
              Կառավարել հյուրերին →
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Առաջիկա միջոցառումներ"
          action={
            <Link to={`/projects/${projectId}/schedule`} className="text-sm text-stone-600 hover:underline">
              Բոլորը →
            </Link>
          }
        />
        <CardBody>
          {summary.upcomingSchedule.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">Առաջիկա միջոցառումներ չկան</p>
          ) : (
            <div className="space-y-3">
              {summary.upcomingSchedule.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-rose-50">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-rose-200 flex items-center justify-center">
                    <Calendar size={20} className="text-stone-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-900">{item.title}</p>
                    <p className="text-sm text-stone-500">{item.locationName}</p>
                  </div>
                  <p className="text-sm text-stone-600 font-medium">{formatTime(item.startTime)}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
