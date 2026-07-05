"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart-context";

export default function ClearCartOnMount() {
  const { hydrated, clearCart } = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    // Cart hydration (reading localStorage) races this component's own mount
    // effect. Wait for `hydrated` so we clear the real cart, not the
    // pre-hydration empty placeholder that's about to be overwritten.
    if (hydrated && !cleared.current) {
      cleared.current = true;
      clearCart();
    }
  }, [hydrated, clearCart]);

  return null;
}
