import { useEffect, useState } from 'react';
import { Users, Monitor, Activity, AlertCircle } from 'lucide-react';
import { usersApi, devicesApi, sessionsApi } from '../services/api';
import toast from 'react-hot-toast';

interface Stats {
  totalUsers: number;
  totalDevices: number;
  activeSessions: number;
  onlineDevices: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDevices: 0,
    activeSessions: 0,
    onlineDevices: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [usersRes, devicesRes, sessionsRes] = await Promise.all([
        usersApi.list(),
        devicesApi.list(),
        sessionsApi.list(),
      ]);

      setStats({
        totalUsers: usersRes.data.users.length,
        totalDevices: devicesRes.data.devices.length,
        activeSessions: sessionsRes.data.sessions.length,
        onlineDevices: devicesRes.data.devices.filter((d: any) => d.status === 'online').length,
      });
    } catch (error: any) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Devices',
      value: stats.totalDevices,
      icon: Monitor,
      color: 'bg-green-500',
    },
    {
      title: 'Active Sessions',
      value: stats.activeSessions,
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      title: 'Online Devices',
      value: stats.onlineDevices,
      icon: AlertCircle,
      color: 'bg-orange-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div key={card.title} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API Service</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Running
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Connected
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sunshine Service</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Active
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">PXE Server</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                Running
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="btn btn-primary w-full">
              Add New User
            </button>
            <button className="btn btn-secondary w-full">
              Register Device
            </button>
            <button className="btn btn-secondary w-full">
              View Active Sessions
            </button>
            <button className="btn btn-secondary w-full">
              Generate PXE Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
