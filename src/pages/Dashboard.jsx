import React from 'react';
import { useRBAC } from '@/context/RBACContext';
import SuperAdminDashboard from '@/components/dashboard/SuperAdminDashboard';
import GeneralAdminDashboard from '@/components/dashboard/GeneralAdminDashboard';
import WorkspaceAdminDashboard from '@/components/dashboard/WorkspaceAdminDashboard';
import MemberDashboard from '@/components/dashboard/MemberDashboard';

export default function Dashboard() {
  const { currentUser, role, loading } = useRBAC();

  if (loading) return (
    <div className="p-6 text-center text-gray-400 py-16">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
      Lade Dashboard...
    </div>
  );

  if (!currentUser) return null;

  if (role === 'super_admin' || role === 'admin') {
    return <SuperAdminDashboard currentUser={currentUser} />;
  }
  if (role === 'general_admin') {
    return <GeneralAdminDashboard currentUser={currentUser} />;
  }
  if (role === 'workspace_admin') {
    return <WorkspaceAdminDashboard currentUser={currentUser} />;
  }
  return <MemberDashboard currentUser={currentUser} />;
}