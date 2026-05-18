type MetaPixelPayload = Record<string, unknown>;

declare global {
  interface Window {
    fbq?: {
      (command: 'track', event: string, params?: MetaPixelPayload, options?: MetaPixelPayload): void;
      (command: 'init', pixelId: string): void;
      (command: string, ...args: unknown[]): void;
    };
  }
}

export function trackMetaPixel(event: string, params?: MetaPixelPayload, options?: MetaPixelPayload): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  window.fbq('track', event, params, options);
}

export function toMetaContents(
  items: ReadonlyArray<{ productId?: string; id?: string; quantity: number; itemPrice?: number; unitPrice?: number }>,
) {
  return items.map((item) => ({
    id: item.productId ?? item.id,
    quantity: item.quantity,
    item_price: item.itemPrice ?? item.unitPrice,
  }));
}
