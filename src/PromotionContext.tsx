import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { Product } from './types';
import type { CheapChampionSettings, FlashSaleSettings } from './types/settings';

type PromotionBadgeContextValue = {
  isCheapChampionProduct: (productId: string) => boolean;
  isActiveFlashSaleProduct: (productId: string) => boolean;
  getCheapChampionPrice: (product: Product) => number | null;
};

const PromotionBadgeContext = createContext<PromotionBadgeContextValue>({
  isCheapChampionProduct: () => false,
  isActiveFlashSaleProduct: () => false,
  getCheapChampionPrice: () => null,
});

const isCampaignLive = (settings: { isActive: boolean; startTime: string; endTime: string } | null) => {
  if (!settings?.isActive || !settings.startTime || !settings.endTime) return false;

  const now = Date.now();
  const start = new Date(settings.startTime).getTime();
  const end = new Date(settings.endTime).getTime();

  return Number.isFinite(start) && Number.isFinite(end) && now >= start && now <= end;
};

export const PromotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cheapChampion, setCheapChampion] = useState<CheapChampionSettings | null>(null);
  const [flashSale, setFlashSale] = useState<FlashSaleSettings | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!db) return;

    const unsubscribeCheapChampion = onSnapshot(doc(db, 'settings', 'cheapChampion'), (snapshot) => {
      setCheapChampion(snapshot.exists() ? snapshot.data() as CheapChampionSettings : null);
    });

    const unsubscribeFlashSale = onSnapshot(doc(db, 'settings', 'flashSale'), (snapshot) => {
      setFlashSale(snapshot.exists() ? snapshot.data() as FlashSaleSettings : null);
    });

    return () => {
      unsubscribeCheapChampion();
      unsubscribeFlashSale();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const value = useMemo<PromotionBadgeContextValue>(() => {
    const cheapChampionLive = isCampaignLive(cheapChampion);
    const cheapChampionIds = new Set(cheapChampionLive ? cheapChampion?.productIds || [] : []);
    const flashSaleIds = new Set(isCampaignLive(flashSale) ? flashSale?.products?.map(product => product.id) || [] : []);

    return {
      isCheapChampionProduct: (productId: string) => cheapChampionIds.has(productId),
      isActiveFlashSaleProduct: (productId: string) => flashSaleIds.has(productId),
      getCheapChampionPrice: (product: Product) => {
        if (!cheapChampionLive || !cheapChampionIds.has(product.id)) return null;

        const currentPrice = product.discountPrice || product.price;
        const discountValue = Number(cheapChampion?.discountValue) || 0;
        if (discountValue <= 0) return null;

        const discountedPrice = cheapChampion?.discountType === 'percent'
          ? currentPrice * (1 - Math.min(discountValue, 100) / 100)
          : currentPrice - discountValue;

        return Math.max(0, Math.round(discountedPrice));
      },
    };
  }, [cheapChampion, flashSale, nowTick]);

  return (
    <PromotionBadgeContext.Provider value={value}>
      {children}
    </PromotionBadgeContext.Provider>
  );
};

export const usePromotionBadges = () => useContext(PromotionBadgeContext);
