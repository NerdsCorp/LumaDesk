import { useEffect, useState } from 'react';
import { Monitor, Link2, Trash2, Power } from 'lucide-react';
import { devicesApi } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Device {
  id: string;
  device_id: string;
  hostname?: string;
  mac_address?: string;
  ip_address?: string;
  status: 'online' | 'offline' | 'deprovisioned';
  last_seen?: string;
  paired_at?: string;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pairingToken, setPairingToken] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await devicesApi.list();
      setDevices(response.data.devices);
    } catch (error: any) {
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePair = async (deviceId: string) => {
    try {
      const response = await devicesApi.pair(deviceId);
      setPairingToken(response.data.pairing_token);
      toast.success('Pairing token generated');
    } catch (error: any) {
      toast.error('Failed to generate pairing token');
    }
  };

  const handleDeprovision = async (deviceId: string) => {
    if (!confirm('Are you sure you want to deprovision this device?')) return;

    try {
      await devicesApi.deprovision(deviceId);
      toast.success('Device deprovisioned');
      loadDevices();
    } catch (error: any) {
      toast.error('Failed to deprovision device');
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      await devicesApi.delete(deviceId);
      toast.success('Device deleted');
      loadDevices();
    } catch (error: any) {
      toast.error('Failed to delete device');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Devices</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-sm text-gray-600">Total Devices</div>
          <div className="text-2xl font-bold">{devices.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">Online</div>
          <div className="text-2xl font-bold text-green-600">
            {devices.filter((d) => d.status === 'online').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-600">Offline</div>
          <div className="text-2xl font-bold text-gray-600">
            {devices.filter((d) => d.status === 'offline').length}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hostname
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MAC Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Seen
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Monitor className="w-5 h-5 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{device.device_id}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{device.hostname || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{device.mac_address || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{device.ip_address || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        device.status === 'online'
                          ? 'bg-green-100 text-green-800'
                          : device.status === 'offline'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.last_seen ? format(new Date(device.last_seen), 'MMM d, yyyy HH:mm') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handlePair(device.device_id)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                      title="Generate pairing token"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeprovision(device.device_id)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                      title="Deprovision"
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(device.device_id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pairing Token Modal */}
      {pairingToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Pairing Token</h2>
            <p className="text-gray-600 mb-4">
              Use this token to pair the device with Sunshine:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <code className="text-sm font-mono break-all">{pairingToken}</code>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(pairingToken);
                toast.success('Token copied to clipboard');
              }}
              className="btn btn-primary w-full mb-2"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => setPairingToken(null)}
              className="btn btn-secondary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
