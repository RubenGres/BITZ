// components/ZoomControls.tsx
import React from 'react';

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    zoomLevel: number;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
    onZoomIn,
    onZoomOut,
    onResetZoom,
    zoomLevel
}) => {
    return (
        <>
            {/* Zoom controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
                <button
                    onClick={onZoomIn}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title="Zoom In"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
                <button
                    onClick={onZoomOut}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title="Zoom Out"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                    </svg>
                </button>
                <button
                    onClick={onResetZoom}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title="Reset View"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Zoom level indicator */}
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                {Math.round(zoomLevel * 100)}%
            </div>
        </>
    );
};

export default ZoomControls;