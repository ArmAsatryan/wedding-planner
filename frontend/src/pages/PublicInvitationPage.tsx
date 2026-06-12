import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi, ApiError } from '../lib/api';
import type { InvitationPreview } from '../lib/api';
import { InvitationCard } from '../components/invitations/InvitationCard';

export function PublicInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    publicApi.invitation(token)
      .then(setInvitation)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Հրավերը չի գտնվել');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-rose-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 p-4">
        <p className="text-rose-600 text-center">{error || 'Հրավերը չի գտնվել'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 flex items-center justify-center p-4 py-10">
      <div className="shadow-2xl">
        <InvitationCard
          guestName={invitation.guestName}
          content={invitation.content}
          brideName={invitation.brideName}
          groomName={invitation.groomName}
          weddingDate={invitation.weddingDate}
          backgroundImage={invitation.backgroundImage}
          schedule={invitation.schedule}
        />
      </div>
    </div>
  );
}
