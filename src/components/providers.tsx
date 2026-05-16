'use client';

import { ReactNode } from 'react';
import { MqttProvider } from '@/lib/iot';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MqttProvider>
      {children}
    </MqttProvider>
  );
}