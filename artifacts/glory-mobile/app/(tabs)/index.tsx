import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TurfOwnerDashboard from '@/components/turf-owner/TurfOwnerDashboard';
import PlayerHome from '@/components/PlayerHome';

export default function HomeTab() {
  const { userRole } = useAuth();
  if (userRole === 'turf_owner') return <TurfOwnerDashboard />;
  return <PlayerHome />;
}
