export type PaymentMethodForShipping = 'cod' | 'bank_transfer' | 'momo' | 'zalopay' | 'shopeepay' | string;

export interface ShippingSettings {
  codFee: number;
  codFreeThreshold: number;
  bankTransferFree: boolean;
  momoFree: boolean;
  zalopayFree: boolean;
  shopeepayFree: boolean;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  codFee: 18000,
  codFreeThreshold: 200000,
  bankTransferFree: true,
  momoFree: true,
  zalopayFree: true,
  shopeepayFree: true,
};

export const normalizeShippingSettings = (settings?: Partial<ShippingSettings> | null): ShippingSettings => ({
  ...DEFAULT_SHIPPING_SETTINGS,
  ...(settings || {}),
  codFee: Number(settings?.codFee ?? DEFAULT_SHIPPING_SETTINGS.codFee),
  codFreeThreshold: Number(settings?.codFreeThreshold ?? DEFAULT_SHIPPING_SETTINGS.codFreeThreshold),
  bankTransferFree: settings?.bankTransferFree ?? DEFAULT_SHIPPING_SETTINGS.bankTransferFree,
  momoFree: settings?.momoFree ?? DEFAULT_SHIPPING_SETTINGS.momoFree,
  zalopayFree: settings?.zalopayFree ?? DEFAULT_SHIPPING_SETTINGS.zalopayFree,
  shopeepayFree: settings?.shopeepayFree ?? DEFAULT_SHIPPING_SETTINGS.shopeepayFree,
});

export const calculateShippingFee = (
  settings: ShippingSettings,
  paymentMethod: PaymentMethodForShipping,
  subtotalAfterDiscount: number,
) => {
  if (paymentMethod === 'cod') {
    return subtotalAfterDiscount >= settings.codFreeThreshold ? 0 : settings.codFee;
  }

  if (paymentMethod === 'bank_transfer') return settings.bankTransferFree ? 0 : settings.codFee;
  if (paymentMethod === 'momo') return settings.momoFree ? 0 : settings.codFee;
  if (paymentMethod === 'zalopay') return settings.zalopayFree ? 0 : settings.codFee;
  if (paymentMethod === 'shopeepay') return settings.shopeepayFree ? 0 : settings.codFee;

  return 0;
};
