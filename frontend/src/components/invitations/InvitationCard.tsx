import { forwardRef } from 'react';
import { MapPin } from 'lucide-react';
import { formatDate } from '../../lib/format';
import type { InvitationScheduleItem } from '../../lib/api';
import { formatScheduleTimeRange } from '../../lib/invitationSchedule';

interface InvitationCardProps {
  guestName: string;
  content: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  backgroundImage?: string | null;
  schedule?: InvitationScheduleItem[];
}

export const InvitationCard = forwardRef<HTMLDivElement, InvitationCardProps>(
  function InvitationCard(
    { guestName, content, brideName, groomName, weddingDate, backgroundImage, schedule = [] },
    ref
  ) {
    const hasBg = Boolean(backgroundImage);
    const hasSchedule = schedule.length > 0;

    return (
      <div
        ref={ref}
        className={`relative rounded-sm w-[360px] flex flex-col invitation-card ${
          hasSchedule ? 'min-h-[640px]' : 'min-h-[560px]'
        }`}
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
          <div className="flex flex-col items-center">
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

            <p
              className={`text-base font-medium mb-6 leading-relaxed ${
                hasBg ? 'text-white' : 'text-stone-800'
              }`}
            >
              {guestName}
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

            {hasSchedule && (
              <div
                className={`w-full max-w-xs mx-auto mt-6 p-5 border text-left ${
                  hasBg ? 'border-white/25 bg-white/10 backdrop-blur-sm' : 'border-stone-200 bg-white'
                }`}
              >
                <p
                  className={`text-[10px] tracking-[0.25em] uppercase mb-4 text-center ${
                    hasBg ? 'text-white/70' : 'text-stone-400'
                  }`}
                >
                  Ժամանականգույց
                </p>
                <div className="space-y-4">
                  {schedule.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className={index > 0 ? `pt-4 border-t ${hasBg ? 'border-white/15' : 'border-stone-100'}` : ''}
                    >
                      <p
                        className={`text-xs font-semibold mb-1 ${
                          hasBg ? 'text-white/80' : 'text-stone-500'
                        }`}
                      >
                        {formatScheduleTimeRange(item)}
                      </p>
                      <p className={`text-sm font-medium ${hasBg ? 'text-white' : 'text-stone-800'}`}>
                        {item.title}
                      </p>
                      <div className={`flex items-start gap-1.5 mt-1 ${hasBg ? 'text-white/75' : 'text-stone-500'}`}>
                        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                        <div className="text-xs leading-relaxed">
                          <p>{item.locationName}</p>
                          {item.address !== item.locationName && <p className="opacity-80">{item.address}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
