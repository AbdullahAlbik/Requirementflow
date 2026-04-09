import React from 'react';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title }) {
  return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <div className="text-center">
        <Construction className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-gray-500">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">Dieses Modul wird in der nächsten Phase implementiert.</p>
      </div>
    </div>
  );
}