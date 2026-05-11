import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TurfBookings from '@/components/turf-owner/TurfBookings';
import PlayerMatches from '@/components/PlayerMatches';

export default function MatchesTab() {
  const { userRole } = useAuth();
  if (userRole === 'turf_owner') return <TurfBookings />;
  return <PlayerMatches />;
}
