import { useEffect, useState } from 'react';

/**
 * A wrapper component for client-side only rendering
 * Prevents hydration errors by rendering nothing on server side
 */
export function ClientOnly({ children, fallback = null, ...delegated }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 추가적인 안전장치: window 객체 체크
  if (typeof window === 'undefined' || !hasMounted) {
    return fallback;
  }

  return <div {...delegated}>{children}</div>;
}

/**
 * Version that doesn't add an extra div
 */
export function NoWrapClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 추가적인 안전장치: window 객체 체크  
  if (typeof window === 'undefined' || !hasMounted) {
    return fallback;
  }

  return <>{children}</>;
} 