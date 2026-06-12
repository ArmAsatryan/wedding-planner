export const EXPENSE_CATEGORIES: Record<string, string> = {
  RESTAURANT_VENUE: 'Ռեստորան / վայր',
  DJ: 'DJ',
  PHOTOGRAPHER: 'Լուսանկարիչ',
  VIDEOGRAPHER: 'Տեսագործող',
  FLOWERS: 'Ծաղիկներ',
  WEDDING_DRESS: 'Հարսի հագուստ',
  GROOM_SUIT: 'Փեսայի կոստյում',
  RINGS: 'Մատանիներ',
  INVITATIONS: 'Հրավերներ',
  TAROSIK: 'Տարոսիկ',
  FURSHET: 'Ֆուրշետ',
  CAKE: 'Տորթ',
  DECORATION: 'Զարդարում',
  TRANSPORT: 'Տրանսպորտ',
  OTHER: 'Այլ',
};

export const RSVP_LABELS: Record<string, string> = {
  INVITED: 'Հրավիրված',
  CONFIRMED: 'Հաստատված',
  DECLINED: 'Մերժված',
  PENDING: 'Սպասման',
};

export const RSVP_COLORS: Record<string, string> = {
  INVITED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  DECLINED: 'bg-red-100 text-red-800',
  PENDING: 'bg-amber-100 text-amber-800',
};

export const SIDE_LABELS: Record<string, string> = {
  BRIDE: 'Հարսի կողմ',
  GROOM: 'Փեսայի կողմ',
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Սեփականատեր',
  EDITOR: 'Խմբագիր',
  VIEWER: 'Դիտորդ',
};

export const PAYMENT_LABELS: Record<string, string> = {
  PAID: 'Վճարված',
  UNPAID: 'Չվճարված',
};

export const DEFAULT_INVITATION_TEMPLATE = `Սիրելի {{guestName}},

Մեծ ուրախությամբ հրավիրում ենք Ձեզ {{brideName}}-ի և {{groomName}}-ի հարսանիքին, որը կկայանա {{weddingDate}}-ին։

Սիրով սպասում ենք Ձեզ այս հատուկ օրվա։

Սիրով,
{{brideName}} և {{groomName}}`;
