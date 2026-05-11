import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TurfEarnings from '@/components/turf-owner/TurfEarnings';
import PlayerTurfs from '@/components/PlayerTurfs';

export default function TurfsTab() {
  const { userRole } = useAuth();
  if (userRole === 'turf_owner') return <TurfEarnings />;
  return <PlayerTurfs />;
}
