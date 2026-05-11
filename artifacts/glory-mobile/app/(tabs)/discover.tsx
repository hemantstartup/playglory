import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TurfMyTurfs from '@/components/turf-owner/TurfMyTurfs';
import PlayerDiscover from '@/components/PlayerDiscover';

export default function DiscoverTab() {
  const { userRole } = useAuth();
  if (userRole === 'turf_owner') return <TurfMyTurfs />;
  return <PlayerDiscover />;
}
