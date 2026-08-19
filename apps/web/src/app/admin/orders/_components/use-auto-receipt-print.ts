'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'bemcomer.printStation';
const IFRAME_ID = 'bemcomer-receipt-print-frame';

export function useAutoReceiptPrint() {
  const [enabled, setEnabledState] = useState(false);
  const printedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setEnabledState(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  }, []);

  const printReceipt = useCallback((orderId: string) => {
    if (printedRef.current.has(orderId)) return;
    printedRef.current.add(orderId);

    let frame = document.getElementById(IFRAME_ID) as HTMLIFrameElement | null;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = IFRAME_ID;
      frame.style.position = 'fixed';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.style.visibility = 'hidden';
      document.body.appendChild(frame);
    }
    frame.onload = () => {
      // With Chrome --kiosk-printing this prints silently to the default printer.
      frame!.contentWindow?.focus();
      frame!.contentWindow?.print();
    };
    frame.src = `/receipt/${orderId}?autoprint=1`;
  }, []);

  return { enabled, setEnabled, printReceipt };
}
