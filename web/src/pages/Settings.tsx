import { useState } from 'react';
import { Save, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({
    sunshineHost: 'sunshine',
    sunshinePort: '47984',
    pxeEnabled: true,
    sessionTimeout: '15',
    maxSessions: '100',
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sunshine Configuration */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Sunshine Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sunshine Host
              </label>
              <input
                type="text"
                value={settings.sunshineHost}
                onChange={(e) => setSettings({ ...settings, sunshineHost: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sunshine Port
              </label>
              <input
                type="number"
                value={settings.sunshinePort}
                onChange={(e) => setSettings({ ...settings, sunshinePort: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="pxeEnabled"
                checked={settings.pxeEnabled}
                onChange={(e) => setSettings({ ...settings, pxeEnabled: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="pxeEnabled" className="ml-2 text-sm text-gray-700">
                Enable PXE Server
              </label>
            </div>
          </div>
        </div>

        {/* Session Configuration */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Session Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Terminate sessions after this period of inactivity
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Concurrent Sessions
              </label>
              <input
                type="number"
                value={settings.maxSessions}
                onChange={(e) => setSettings({ ...settings, maxSessions: e.target.value })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* PXE Image Management */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">PXE Image Management</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload or generate PXE boot images for thin clients
              </p>
              <button className="btn btn-primary w-full mb-2 flex items-center justify-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload PXE Image</span>
              </button>
              <button className="btn btn-secondary w-full flex items-center justify-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Generate New Image</span>
              </button>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600 mb-2">Current Image</div>
              <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                lumadesk-client-v1.0.0.img
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Last updated: Dec 26, 2024
              </div>
            </div>
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Backup & Restore</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Backup and restore LumaDesk configuration and database
              </p>
              <button className="btn btn-primary w-full mb-2 flex items-center justify-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Download Backup</span>
              </button>
              <button className="btn btn-secondary w-full flex items-center justify-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Restore from Backup</span>
              </button>
            </div>
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600 mb-2">Last Backup</div>
              <div className="text-xs text-gray-500">
                Dec 26, 2024 at 02:00 AM
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleSave}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </div>
    </div>
  );
}
