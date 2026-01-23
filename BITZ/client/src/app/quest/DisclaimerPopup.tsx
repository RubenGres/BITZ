import React from 'react';

interface DisclaimerPopupProps {
  onAccept: () => void;
  onViewTerms: () => void;
}

const DisclaimerPopup: React.FC<DisclaimerPopupProps> = ({ onAccept, onViewTerms }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-100 max-w-md w-full">
        {/* Header */}
        <div className="bg-[#f0512e] text-white p-4 flex items-center relative -left-2 -top-2">
          <h2 className="text-lg font-bold">
            <span className="mr-2">▶▶▶</span>
            DISCLAIMER
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">BITZ makes mistakes </h3>
            <div className="space-y-2 text-[#6ac497] font-bold leading-relaxed">
              <p>Do not consume any species based on information provided by BITZ.</p>
              <p>Do not take any medical advice provided by BITZ.</p>
              <p>Please explore your surroundings safely and use your best judgement.</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-2">DATA USAGE</h3>
            <p className="text-[#6ac497] font-bold leading-relaxed">
              By using BITZ, you consent to your submitted images being added to a public dataset for ecological research. 
              All data will be anonymized.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onViewTerms}
              className="text-blue-600 underline hover:text-blue-800"
            >
              View Full Terms of Service
            </button>
          </div>
        </div>

        {/* Footer Button */}
        <div className="p-4">
          <button
            onClick={onAccept}
            className="w-full bg-white text-orange-500 border-2 border-orange-500 py-3 px-4 hover:bg-orange-50 transition-colors font-medium"
          >
            I Understand & Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerPopup;