import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, X, ImageIcon } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { InvitationScheduleItem } from '../lib/api';
import { DEFAULT_INVITATION_TEMPLATE } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Textarea } from '../components/ui/Input';
import { InvitationCard } from '../components/invitations/InvitationCard';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export function InvitationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState(DEFAULT_INVITATION_TEMPLATE);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [brideName, setBrideName] = useState('...');
  const [groomName, setGroomName] = useState('...');
  const [weddingDate, setWeddingDate] = useState(new Date().toISOString());
  const [schedule, setSchedule] = useState<InvitationScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      api.invitations.getTemplate(projectId),
      api.projects.get(projectId),
      api.schedule.list(projectId),
    ]).then(([tmpl, project, scheduleItems]) => {
      if (tmpl?.template) setTemplate(tmpl.template);
      if (tmpl?.backgroundImage) setBackgroundImage(tmpl.backgroundImage);
      setBrideName(project.brideName);
      setGroomName(project.groomName);
      setWeddingDate(project.weddingDate);
      setSchedule(scheduleItems);
    }).finally(() => setLoading(false));
  }, [projectId]);

  const previewContent = useMemo(
    () =>
      template
        .replace(/\{\{guestName\}\}/g, 'Հյուր')
        .replace(/\{\{brideName\}\}/g, brideName)
        .replace(/\{\{groomName\}\}/g, groomName)
        .replace(/\{\{weddingDate\}\}/g, '...'),
    [template, brideName, groomName]
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Խնդրում ենք ընտրել պատկեր');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setMessage('Պատկերի չափը չպետք է գերազանցի 3MB-ը');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setBackgroundImage(reader.result as string);
    reader.readAsDataURL(file);
    setMessage('');
  };

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    setMessage('');
    try {
      await api.invitations.updateTemplate(projectId, { template, backgroundImage });
      setMessage('Հրավերը պահպանված է');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-stone-900">Հրավերներ</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Ստեղծեք և պահպանեք հրավերի կաղապարը։ Յուրաքանչյուր հյուրի անհատական link-ը ցուցադրվում է Հյուրեր էջում։
        </p>
      </div>

      {message && (
        <div className="text-sm text-stone-600 bg-stone-100 rounded-lg px-3 py-2">{message}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Ֆոնային պատկեր" subtitle="Ներբեռնեք հրավերի ֆոն" />
            <CardBody className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {backgroundImage ? (
                <div className="relative rounded-lg overflow-hidden border border-stone-200">
                  <img src={backgroundImage} alt="Ֆոն" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setBackgroundImage(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-lg border border-dashed border-stone-300 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-stone-400 hover:text-stone-500 transition-colors"
                >
                  <Upload size={20} />
                  <span className="text-sm">Ներբեռնել պատկեր</span>
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={14} />
                {backgroundImage ? 'Փոխել պատկերը' : 'Ընտրել պատկեր'}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Տեքստ" subtitle="{{guestName}}, {{brideName}}, {{groomName}}, {{weddingDate}} — Ժամանականգույցը ավտոմատ է" />
            <CardBody className="space-y-3">
              <Textarea
                label="Կաղապար"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="min-h-[160px] font-serif text-sm"
              />
              <Button onClick={handleSave} loading={saving} size="sm">
                Պահպանել
              </Button>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Նախադիտում" subtitle="Օրինակ՝ «Հյուր» անունով" />
          <CardBody>
            <div className="flex justify-center py-2">
              <div className="shadow-lg">
                <InvitationCard
                  guestName="Հյուր"
                  content={previewContent}
                  brideName={brideName}
                  groomName={groomName}
                  weddingDate={weddingDate}
                  backgroundImage={backgroundImage}
                  schedule={schedule}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
