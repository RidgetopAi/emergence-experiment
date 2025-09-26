import React from 'react';
import { Providers } from './providers';
import { TimelineExplorer } from '@/components/TimelineExplorer';

export default function HomePage() {
  return (
    <Providers>
      <TimelineExplorer />
    </Providers>
  );
}
