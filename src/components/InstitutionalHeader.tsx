import React from 'react';

export const InstitutionalHeader: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <img
            src="https://i.pinimg.com/736x/0c/1c/d4/0c1cd4c422beb2b7540d658957f29aae.jpg"
            alt="School of Cognitive Science, Jadavpur University Logo"
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
          />
          <div className="text-center">
            <h1 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
              This Survey Manager Webapp is developed by
            </h1>
            <p className="text-sm sm:text-base font-bold text-blue-700">
              School of Cognitive Science, Jadavpur University
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};