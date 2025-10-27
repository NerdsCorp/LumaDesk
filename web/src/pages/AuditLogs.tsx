import { useEffect, useState } from 'react';
import { FileText, Filter } from 'lucide-react';
import { auditLogsApi } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await auditLogsApi.list(100, 0);
      setLogs(response.data.logs);
    } catch (error: any) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!filter) return true;
    return (
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(filter.toLowerCase()) ||
      log.username?.toLowerCase().includes(filter.toLowerCase())
    );
  });

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('terminate')) {
      return 'bg-red-100 text-red-800';
    }
    if (action.includes('create') || action.includes('add')) {
      return 'bg-green-100 text-green-800';
    }
    if (action.includes('update') || action.includes('edit')) {
      return 'bg-blue-100 text-blue-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="card mb-6 p-4">
        <div className="flex items-center space-x-3">
          <FileText className="w-6 h-6 text-primary-500" />
          <div>
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-sm text-gray-600">Total Log Entries</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {log.username || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.resource_type}</div>
                    {log.resource_id && (
                      <div className="text-xs text-gray-500 font-mono truncate max-w-xs">
                        {log.resource_id}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {log.details && (
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer hover:text-gray-900">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-50 rounded overflow-auto max-w-md">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
