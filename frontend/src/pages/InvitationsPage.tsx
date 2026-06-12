import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Eye, Upload, X, ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { api, ApiError } from '../lib/api';
import type { Guest, InvitationPreview } from '../lib/api';
import { DEFAULT_INVITATION_TEMPLATE } from '../lib/constants';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Textarea, Select } from '../components/ui/Input';
import { InvitationCard } from '../components/invitations/InvitationCard';

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export function InvitationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [template, setTemplate] = useState(DEFAULT_INVITATION_TEMPLATE);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState('all');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      api.invitations.getTemplate(projectId),
      api.guests.list(projectId),
    ]).then(([tmpl, guestRes]) => {
      if (tmpl?.template) setTemplate(tmpl.template);
      if (tmpl?.backgroundImage) setBackgroundImage(tmpl.backgroundImage);
      setGuests(guestRes.guests);
    }).finally(() => setLoading(false));
  }, [projectId]);

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
      setMessage('Պահպանված է');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!projectId) return;
    setMessage('');
    try {
      const guestId = selectedGuest === 'all' ? undefined : selectedGuest;
      const res = await api.invitations.preview(projectId, guestId);
      setPreview(res.previews[0] || null);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Սխալ է տեղի ունեցել');
    }
  };

  const exportCanvas = async () => {
    if (!previewRef.current) return null;
    return html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
  };

  const downloadPDF = async () => {
    if (!preview) return;
    const canvas = await exportCanvas();
    if (!canvas) return;
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`հրավեր-${preview.guestName}.pdf`);
  };

  const downloadImage = async () => {
    if (!preview) return;
    const canvas = await exportCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `հրավեր-${preview.guestName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
        <p className="text-sm text-stone-500 mt-0.5">Կազմեք և ներբեռնեք հրավերներ</p>
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
            <CardHeader title="Տեքստ" subtitle="{{guestName}}, {{brideName}}, {{groomName}}, {{weddingDate}}" />
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
          <CardHeader title="Նախադիտում" />
          <CardBody className="space-y-4">
            <Select label="Հյուր" value={selectedGuest} onChange={(e) => setSelectedGuest(e.target.value)}>
              <option value="all">Բոլոր հյուրերը</option>
              {guests.map((g) => (
                <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
              ))}
            </Select>
            <Button variant="secondary" size="sm" onClick={handlePreview}>
              <Eye size={14} /> Նախադիտել
            </Button>

            {preview && (
              <>
                <div className="max-w-sm mx-auto shadow-lg">
                  <InvitationCard
                    ref={previewRef}
                    guestName={preview.guestName}
                    content={preview.content}
                    brideName={preview.brideName}
                    groomName={preview.groomName}
                    weddingDate={preview.weddingDate}
                    backgroundImage={backgroundImage}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={downloadPDF} size="sm" className="flex-1">
                    <Download size={14} /> PDF
                  </Button>
                  <Button variant="secondary" onClick={downloadImage} size="sm" className="flex-1">
                    <ImageIcon size={14} /> PNG
                  </Button>
                </div>
              </>
            )}

            {!preview && guests.length > 0 && (
              <div className="max-w-sm mx-auto opacity-60">
                <InvitationCard
                  guestName="Հյուր"
                  content={template.replace(/\{\{guestName\}\}/g, 'Հյուր').replace(/\{\{brideName\}\}/g, '...').replace(/\{\{groomName\}\}/g, '...').replace(/\{\{weddingDate\}\}/g, '...')}
                  brideName="..."
                  groomName="..."
                  weddingDate={new Date().toISOString()}
                  backgroundImage={backgroundImage}
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
