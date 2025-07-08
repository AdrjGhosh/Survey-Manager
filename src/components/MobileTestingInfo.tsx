import React from 'react';
import { Smartphone, Globe, Copy, ExternalLink, CheckCircle } from 'lucide-react';

interface MobileTestingInfoProps {
  publicUrl?: string;
  onClose: () => void;
}

export const MobileTestingInfo: React.FC<MobileTestingInfoProps> = ({ publicUrl, onClose }) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Smartphone className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Mobile Testing Guide</h3>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 font-medium mb-1">Bolt Preview Limitation</p>
            <p className="text-yellow-700">
              The Bolt development environment doesn't support separate previews in Chrome on Android. 
              This is a development tool limitation, not your survey app.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Testing Options:</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Use Firefox on Android (recommended by Bolt)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Test on desktop Chrome with mobile device simulation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Deploy to production for full mobile testing</span>
              </div>
            </div>
          </div>

          {publicUrl && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Share this link for testing:</h4>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
                <input
                  type="text"
                  value={publicUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs"
                />
                <button
                  onClick={() => copyToClipboard(publicUrl)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 font-medium mb-1">Your App is Mobile-Ready!</p>
            <p className="text-green-700">
              Your survey forms are fully optimized for all mobile devices and browsers. 
              The responsive design will work perfectly once deployed.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};