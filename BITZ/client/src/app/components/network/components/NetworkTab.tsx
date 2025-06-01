// components/NetworkTab.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Node } from '../models/Node';
import { Connection } from '../models/Connection';
import { NetworkTabProps, SpeciesInfo } from '../models/types';
import { processQuestData, findSpeciesInfo } from '../utils/networkUtils';
import { useNetworkCanvas } from '../hooks/useNetworkCanvas';
import { useResponsive } from '../hooks/useResponsive';
import SpeciesInfoPanel from './SpeciesInfoPanel';
import ZoomControls from './ZoomControls';

const NetworkTab: React.FC<NetworkTabProps> = ({ 
    questDataDict,
    questId,
    loading,
    error
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    
    // State for the sliding info panel
    const [selectedSpecies, setSelectedSpecies] = useState<SpeciesInfo | null>(null);
    const [selectedQuestId, setSelectedQuestId] = useState("");
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    
    // Get responsive state
    const { isMobile } = useResponsive();
    
    // Handle node click to show info panel
    const handleNodeClick = (node: Node) => {
        console.log('Node clicked:', node.quest_id);
        
        const speciesInfo = findSpeciesInfo(node.image_filename, node.quest_id, questDataDict);

        if (speciesInfo) {
            setSelectedQuestId(node.quest_id);
            setSelectedSpecies(speciesInfo);
            setIsPanelOpen(true);
        } else {
            console.warn('No species info found for this node');
        }
    };
    
    // Close the info panel
    const handleClosePanel = () => {
        setIsPanelOpen(false);
    };
    
    // Set up canvas handling
    const { 
        selectedNode,
        isDragging,
        isPanning,
        zoomLevel,
        panOffset,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        handleWheel,
        handleZoomIn,
        handleZoomOut,
        handleResetZoom,
        startAnimation,
        stopAnimation
    } = useNetworkCanvas({
        canvasRef,
        nodes,
        connections,
        handleNodeClick
    });
    
    // Process CSV data when questData is available
    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const width = canvas.width;
            const height = canvas.height;
            
            processQuestData(questDataDict, width, height, (processedNodes, processedConnections) => {
                setNodes(processedNodes);
                setConnections(processedConnections);
                startAnimation();
            });
        }
        
        // Cleanup animation on unmount
        return () => {
            stopAnimation();
        };
    }, [questDataDict]);
    
    // Set canvas size
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            // Get the parent container dimensions
            const parent = canvas.parentElement;
            if (!parent) return;

            // Set canvas size to match container
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            
            // If we have nodes, reinitialize the layout
            if (nodes.length > 0) {
                const width = canvas.width;
                const height = canvas.height;
                
                nodes.forEach((node, index) => {
                    const angle = (index / nodes.length) * Math.PI * 2;
                    const radius = Math.min(width, height) * 0.3;
                    node.x = width / 2 + radius * Math.cos(angle);
                    node.y = height / 2 + radius * Math.sin(angle);
                });
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [nodes]);

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="flex flex-col h-[70vh]">
            <div className="flex-1 relative overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="block"
                    style={{ 
                        cursor: isPanning ? 'grabbing' : isDragging ? 'grabbing' : 'grab',
                        width: '100%',
                        height: '100%',
                        touchAction: 'none'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onWheel={handleWheel}
                />
                
                {/* Zoom controls */}
                <ZoomControls 
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onResetZoom={handleResetZoom}
                    zoomLevel={zoomLevel}
                />
                
                {/* Species Info Panel */}
                <SpeciesInfoPanel 
                    questId={selectedQuestId}
                    species={selectedSpecies}
                    isOpen={isPanelOpen}
                    onClose={handleClosePanel}
                    isMobile={isMobile}
                />
            </div>
        </div>
    );
};

export default NetworkTab;