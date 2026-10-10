export type PropertyPin = {
  id: number;
  title: string;
  price: string;
  rawPrice: number;
  legalStatus: string;
  area: string;
  city: string;
  neighborhood?: string | null;
  lat: number;
  lng: number;
  mainImage: string | null;
  sponsoredUntil?: string | null;
  metaBoostedUntil?: string | null;
  instagramMediaId?: string | null;
  instagramPermalink?: string | null;
  listingType?: string | null;
  minNights?: number | null;
  maxGuests?: number | null;
  depositPercentage?: number | null;
  pixKey?: string | null;
  customRates?: any;
};

export function normalizeProperties(items: any[]): PropertyPin[] {
  return (items || [])
    .map((item: any) => ({
      id: Number(item.id),
      title: item.title,
      price: `R$ ${Number(item.price).toLocaleString("pt-BR")}`,
      rawPrice: Number(item.price || 0),
      legalStatus: item.legalStatus || "-",
      area: item.area || "-",
      city: item.city || "-",
      neighborhood: item.neighborhood || null,
      lat: Number(item.latitude),
      lng: Number(item.longitude),
      mainImage: item.images?.[0]?.imageUrl || null,
      sponsoredUntil: item.sponsoredUntil || null,
      metaBoostedUntil: item.metaBoostedUntil || null,
      instagramMediaId: item.instagramMediaId || null,
      instagramPermalink: item.instagramPermalink || null,
      listingType: item.listingType || "COMPRA_VENDA",
      minNights: item.minNights ? Number(item.minNights) : null,
      maxGuests: item.maxGuests ? Number(item.maxGuests) : null,
      depositPercentage:
        item.depositPercentage !== undefined && item.depositPercentage !== null
          ? Number(item.depositPercentage)
          : 20,
      pixKey: item.pixKey || null,
      customRates: item.customRates || {},
    }))
    .sort((a: any, b: any) => {
      const isNow = new Date();
      const aSpon = a.sponsoredUntil && new Date(a.sponsoredUntil) > isNow;
      const aIG = !!a.instagramMediaId;
      const bSpon = b.sponsoredUntil && new Date(b.sponsoredUntil) > isNow;
      const bIG = !!b.instagramMediaId;

      const getScore = (spon: boolean, ig: boolean) => {
        if (spon && ig) return 3; // Nível 1: Patrocínio + IG
        if (spon) return 2; // Nível 2: Só Patrocínio
        if (ig) return 1; // Nível 3: Só IG
        return 0; // Nível 4: Comum
      };

      return getScore(bSpon, bIG) - getScore(aSpon, aIG);
    });
}
