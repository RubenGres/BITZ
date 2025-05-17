// hooks/useNetworkCanvas.ts
import { useState, useRef, useEffect } from 'react';
import { Node } from '../models/Node';
import { Connection } from '../models/Connection';
import { applyForces } from '../utils/networkUtils';
import { Point, DragOffset, PanOffset } from '../models/types';

interface UseNetworkCanvasProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    nodes: Node[];
    connections: Connection[];
    handleNodeClick: (node: Node) => void;
}

interface UseNetworkCanvasReturn {
    selectedNode: Node | null;
    isDragging: boolean;
    isPanning: boolean;
    zoomLevel: number;
    panOffset: PanOffset;
    handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
    handleTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
    handleTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
    handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    handleResetZoom: () => void;
    startAnimation: () => void;
    stopAnimation: () => void;
}

export const useNetworkCanvas = ({
    canvasRef,
    nodes,
    connections,
    handleNodeClick
}: UseNetworkCanvasProps): UseNetworkCanvasReturn => {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState<PanOffset>({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [touchDistance, setTouchDistance] = useState(0);
    const [isTouching, setIsTouching] = useState(false);
    const [touchCenter, setTouchCenter] = useState<Point>({ x: 0, y: 0 });
    
    const animationRef = useRef<number>(0);
    
    // Create refs to hold the current pan offset and zoom
    const panOffsetRef = useRef<PanOffset>({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    
    // Update refs when state changes
    useEffect(() => {
        panOffsetRef.current = panOffset;
        zoomRef.current = zoomLevel;
    }, [panOffset, zoomLevel]);
    
    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);
    
    // Get canvas coordinates from screen coordinates
    const getCanvasCoordinates = (screenX: number, screenY: number): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (screenX - rect.left - panOffset.x) / zoomLevel;
        const y = (screenY - rect.top - panOffset.y) / zoomLevel;
        return { x, y };
    };
    
    // Animation function
    const startAnimation = () => {
        const animate = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Canvas context not available');
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();

            // Use the ref values for pan and zoom
            ctx.translate(panOffsetRef.current.x, panOffsetRef.current.y);
            ctx.scale(zoomRef.current, zoomRef.current);

            applyForces(nodes, connections, selectedNode, isDragging);

            // Draw connections
            connections.forEach(connection => connection.draw(ctx));

            // Draw nodes
            nodes.forEach(node => node.draw(ctx));

            ctx.restore();

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
    };
    
    const stopAnimation = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
    
    // Event handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

        // Check if clicking on a node
        let clickedNode: Node | null = null;
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].contains(x, y)) {
                clickedNode = nodes[i];
                break;
            }
        }

        if (clickedNode) {
            setSelectedNode(clickedNode);
            setIsPanning(false);
            setIsDragging(true);
            setDragOffset({
                x: clickedNode.x - x,
                y: clickedNode.y - y
            });
        } else {
            // Start panning
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

        if (isDragging && selectedNode) {
            selectedNode.x = x + dragOffset.x;
            selectedNode.y = y + dragOffset.y;
            selectedNode.vx = 0;
            selectedNode.vy = 0;
        }
        
        if (isPanning) {
            setPanOffset(prev => ({
                x: prev.x + (e.clientX - panStart.x),
                y: prev.y + (e.clientY - panStart.y)
            }));
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {      
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
        
        if (selectedNode && !isPanning) {
            const hasMovedSinceClick = (dragOffset.x !== (selectedNode.x - x)) || (dragOffset.y !== (selectedNode.y - y));
            if (!hasMovedSinceClick) {
                handleNodeClick(selectedNode);
            }
        }
        
        setIsDragging(false);
        setIsPanning(false);
        setSelectedNode(null);
    };

    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const touches = e.touches;
        setIsTouching(true);

        if (touches.length === 1) {
            // Single touch - check for node or start panning
            const touch = touches[0];
            const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

            let clickedNode: Node | null = null;
            for (let i = nodes.length - 1; i >= 0; i--) {
                if (nodes[i].contains(x, y)) {
                    clickedNode = nodes[i];
                    break;
                }
            }

            if (clickedNode) {
                setSelectedNode(clickedNode);
                setIsPanning(false);
                setIsDragging(true);
                setDragOffset({
                    x: clickedNode.x - x,
                    y: clickedNode.y - y
                });
            } else {
                setIsPanning(true);
                setPanStart({ x: touch.clientX, y: touch.clientY });
            }
        } else if (touches.length === 2) {
            // Two touches - pinch to zoom
            const touch1 = touches[0];
            const touch2 = touches[1];
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            // Calculate center point between the two touches
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            
            setTouchDistance(distance);
            setTouchCenter({ x: centerX, y: centerY });
            setIsPanning(false);
            setIsDragging(false);
        }
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const touches = e.touches;

        if (touches.length === 1) {
            const touch = touches[0];
            
            if (isDragging && selectedNode) {
                const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);
                selectedNode.x = x + dragOffset.x;
                selectedNode.y = y + dragOffset.y;
                selectedNode.vx = 0;
                selectedNode.vy = 0;
            } else if (isPanning) {
                setPanOffset(prev => ({
                    x: prev.x + (touch.clientX - panStart.x),
                    y: prev.y + (touch.clientY - panStart.y)
                }));
                setPanStart({ x: touch.clientX, y: touch.clientY });
            }
        } else if (touches.length === 2) {
            // Pinch to zoom
            const touch1 = touches[0];
            const touch2 = touches[1];
            const distance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            if (touchDistance > 0) {
                const scale = distance / touchDistance;
                const newZoom = Math.max(0.1, Math.min(4, zoomLevel * scale));
                
                // Get canvas coordinates for pinch center
                const rect = canvas.getBoundingClientRect();
                
                // Calculate center point relative to canvas
                const pinchCenterX = touchCenter.x - rect.left;
                const pinchCenterY = touchCenter.y - rect.top;
                
                // Calculate new pan offset to zoom from pinch center
                const scaleChange = newZoom / zoomLevel;
                const newPanOffsetX = pinchCenterX - (pinchCenterX - panOffset.x) * scaleChange;
                const newPanOffsetY = pinchCenterY - (pinchCenterY - panOffset.y) * scaleChange;
                
                setZoomLevel(newZoom);
                setPanOffset({
                    x: newPanOffsetX,
                    y: newPanOffsetY
                });
            }
            setTouchDistance(distance);
            
            // Update touch center for next frame
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            setTouchCenter({ x: centerX, y: centerY });
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        // Check if there was a tap on a node (quick touch without much movement)
        if (selectedNode && !isPanning && !isDragging) {
            handleNodeClick(selectedNode);
        }
        
        setIsTouching(false);
        setIsDragging(false);
        setIsPanning(false);
        setSelectedNode(null);
        setTouchDistance(0);
        setTouchCenter({ x: 0, y: 0 });
    };

    // Mouse wheel zoom from cursor position
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        
        // Get mouse position relative to canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom factor
        const delta = e.deltaY * -0.01;
        const newZoom = Math.max(0.1, Math.min(4, zoomLevel + delta));
        const scaleChange = newZoom / zoomLevel;
        
        // Calculate new pan offset to zoom from mouse position
        const newPanOffsetX = mouseX - (mouseX - panOffset.x) * scaleChange;
        const newPanOffsetY = mouseY - (mouseY - panOffset.y) * scaleChange;
        
        setZoomLevel(newZoom);
        setPanOffset({
            x: newPanOffsetX,
            y: newPanOffsetY
        });
    };

    // Zoom controls
    const handleZoomIn = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Calculate center of canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const newZoom = Math.min(3, zoomLevel * 1.2);
        const scaleChange = newZoom / zoomLevel;
        
        // Zoom from center
        const newPanOffsetX = centerX - (centerX - panOffset.x) * scaleChange;
        const newPanOffsetY = centerY - (centerY - panOffset.y) * scaleChange;
        
        setZoomLevel(newZoom);
        setPanOffset({
            x: newPanOffsetX,
            y: newPanOffsetY
        });
    };

    const handleZoomOut = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Calculate center of canvas
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        const newZoom = Math.max(0.1, zoomLevel * 0.8);
        const scaleChange = newZoom / zoomLevel;
        
        // Zoom from center
        const newPanOffsetX = centerX - (centerX - panOffset.x) * scaleChange;
        const newPanOffsetY = centerY - (centerY - panOffset.y) * scaleChange;
        
        setZoomLevel(newZoom);
        setPanOffset({
            x: newPanOffsetX,
            y: newPanOffsetY
        });
    };

    const handleResetZoom = () => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    };

    return {
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
    };
};