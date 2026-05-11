import React from 'react';
import { useAuth } from '@/context/AuthContext';
import TurfOwnerProfile from '@/components/turf-owner/TurfOwnerProfile';
import PlayerProfile from '@/components/PlayerProfile';

export default function ProfileTab() {
  const { userRole } = useAuth();
  if (userRole === 'turf_owner') return <TurfOwnerProfile />;
  return <PlayerProfile />;
}
