'use client';

import dynamic from 'next/dynamic';

// Dynamically import the map component with no SSR
const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
      Loading map...
    </div>
  ),
});

export default function MapPage() {
  return (
    <main className="w-full h-screen relative">
      <Map />
    </main>
  );
} 