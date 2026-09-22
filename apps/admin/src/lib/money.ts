export const formatBDT = (value: unknown) => {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `৳${safe.toLocaleString("en-BD", {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export const getOriginalPrice = (product: any) =>
  Number(product?.originalPrice ?? product?.price ?? 0);

export const getCurrentPrice = (product: any) =>
  Number(product?.price ?? product?.originalPrice ?? 0);

export const hasActiveOffer = (product: any) => {
  if (product?.offerEnabled !== true) return false;
  const original = getOriginalPrice(product);
  const offer = Number(product?.offerPrice);
  if (!Number.isFinite(offer) || offer < 0 || offer >= original) return false;
  const now = Date.now();
  const start = product?.offerStartAt ? Date.parse(product.offerStartAt) : NaN;
  const end = product?.offerEndAt ? Date.parse(product.offerEndAt) : NaN;
  if (Number.isFinite(start) && now < start) return false;
  if (Number.isFinite(end) && now > end) return false;
  return true;
};
