import { useEffect, useState } from 'react';
import { Activity, XCircle } from 'lucide-react';
import { sessionsApi } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Session {
  id: string;
  user_id: string;
  username?: string;
  device_id: string;
  device_hostname?: string;
  device_mac?: string;
  device_ip?: string;
  status: 'active' | 'inactive' | 'terminated';
  started_at: string;
  last_heartbeat: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSessions = async () => {
    try {
      const response = await sessionsApi.list();
      setSessions(response.data.sessions);
    } catch (error: any) {
      toast.error('Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTerminate = async (sessionId: string) => {
    if (!confirm('Are you sure you want to terminate this session?')) return;

    try {
      await sessionsApi.terminate(sessionId);
      toast.success('Session terminated');
      loadSessions();
    } catch (error: any) {
      toast.error('Failed to terminate session');
    }
  };

  const handleCleanup = async () => {
    try {
      const response = await sessionsApi.cleanup();
      toast.success(`Cleaned up ${response.data.cleaned} stale sessions`);
      loadSessions();
    } catch (error: any) {
      toast.error('Failed to cleanup sessions');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Sessions</h1>
        <button onClick={handleCleanup} className="btn btn-secondary">
          Cleanup Stale Sessions
        </button>
      </div>

      <div className="card mb-6 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Auto-refresh every 10 seconds
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hostname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Heartbeat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No active sessions
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {session.username || session.user_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{session.device_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {session.device_hostname || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {session.device_ip || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(session.started_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(session.last_heartbeat), 'HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleTerminate(session.id)}
                        className="text-red-600 hover:text-red-900 flex items-center justify-end space-x-1"
                        title="Terminate session"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Kick</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
