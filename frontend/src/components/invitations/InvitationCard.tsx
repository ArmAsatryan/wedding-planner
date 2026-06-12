import { forwardRef } from 'react';
import { formatDate } from '../../lib/format';

interface InvitationCardProps {
  guestName: string;
  content: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  backgroundImage?: string | null;
}

export const InvitationCard = forwardRef<HTMLDivElement, InvitationCardProps>(
  function InvitationCard({ content, brideName, groomName, weddingDate, backgroundImage }, ref) {
    const hasBg = Boolean(backgroundImage);

    return (
      <div
        ref={ref}
        className="relative overflow-hidden rounded-sm aspect-[3/4] min-h-[480px] flex flex-col"
        style={{
          fontFamily: 'Noto Serif Armenian, serif',
          backgroundColor: hasBg ? undefined : '#fafaf9',
        }}
      >
        {hasBg && (
          <>
            <img
              src={backgroundImage!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/60" />
          </>
        )}

        <div className="relative z-10 flex flex-col flex-1 p-10 text-center">
          <div className="flex-1 flex flex-col items-center justify-center">
            <p
              className={`text-[10px] tracking-[0.35em] uppercase mb-6 ${
                hasBg ? 'text-white/80' : 'text-stone-400'
              }`}
            >
              Հրավեր
            </p>

            <div className={`w-12 h-px mb-6 ${hasBg ? 'bg-white/50' : 'bg-stone-300'}`} />

            <h2
              className={`text-2xl font-semibold mb-2 tracking-wide ${
                hasBg ? 'text-white' : 'text-stone-800'
              }`}
            >
              {brideName} <span className="font-light">&</span> {groomName}
            </h2>

            <p className={`text-sm mb-8 ${hasBg ? 'text-white/70' : 'text-stone-500'}`}>
              {formatDate(weddingDate)}
            </p>

            <div
              className={`w-full max-w-xs mx-auto p-6 border ${
                hasBg ? 'border-white/25 bg-white/10 backdrop-blur-sm' : 'border-stone-200 bg-white'
              }`}
            >
              <p
                className={`text-sm leading-relaxed whitespace-pre-line ${
                  hasBg ? 'text-white/95' : 'text-stone-700'
                }`}
              >
                {content}
              </p>
            </div>
          </div>

          <div className={`mt-8 pt-6 border-t ${hasBg ? 'border-white/20' : 'border-stone-200'}`}>
            <p className={`text-xs tracking-widest ${hasBg ? 'text-white/60' : 'text-stone-400'}`}>
              Սիրով սպասում ենք Ձեզ
            </p>
          </div>
        </div>

        {!hasBg && (
          <div className="absolute inset-3 border border-stone-200 pointer-events-none rounded-sm" />
        )}
      </div>
    );
  }
);
