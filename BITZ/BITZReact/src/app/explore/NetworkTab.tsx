import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { API_URL } from '@/app/Constants';

interface SpeciesRow {
    'image_name': string;
    'taxonomic_group': string;
    'scientific_name': string;
    'common_name': string;
    'discovery_timestamp': string;
    'confidence': string;
    'notes': string;
}

interface NetworkTabProps {
    questData: any;
    questId: string;
    loading: boolean;
    error: string | null;
}

class Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    name: string;
    scientificName: string;
    taxonomicGroup: string;
    image: HTMLImageElement | null;
    imageSrc: string;
    connections: Connection[];
    id: string;

    constructor(x: number, y: number, size: number, name: string, scientificName: string, taxonomicGroup: string, imageSrc: string) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.size = size;
        this.name = name;
        this.scientificName = scientificName;
        this.taxonomicGroup = taxonomicGroup;
        this.image = null;
        this.imageSrc = imageSrc;
        this.connections = [];
        this.id = Date.now().toString() + Math.random();

        // Load image
        if (imageSrc) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageSrc;
            img.onload = () => {
                this.image = img;
            };
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Damping
        this.vx *= 0.95;
        this.vy *= 0.95;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        if (this.image) {
            // Create circular clipping
            ctx.save();
            ctx.clip();

            // Draw the image
            const imageSize = this.size * 2;
            ctx.drawImage(this.image, this.x - this.size, this.y - this.size, imageSize, imageSize);
            ctx.restore();

            // Draw circle border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Default appearance
            ctx.fillStyle = '#4caf4f';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw label
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '12px Arial';

        // Background for text
        const textWidth = ctx.measureText(this.name).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(this.x - textWidth / 2 - 5, this.y + this.size + 5, textWidth + 10, 15);

        // Draw text
        ctx.fillStyle = '#000';
        ctx.fillText(this.name, this.x, this.y + this.size + 10);
    }

    contains(x: number, y: number): boolean {
        const distance = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        return distance <= this.size;
    }
}

// Connection class
class Connection {
    node1: Node;
    node2: Node;
    text: string;

    constructor(node1: Node, node2: Node, text: string = '') {
        this.node1 = node1;
        this.node2 = node2;
        this.text = text;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const start = { x: this.node1.x, y: this.node1.y };
        const end = { x: this.node2.x, y: this.node2.y };

        // Calculate direction vector
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const ndx = dx / length;
        const ndy = dy / length;

        // Set start and end points on the edge of the circles
        const startX = start.x + ndx * this.node1.size;
        const startY = start.y + ndy * this.node1.size;
        const endX = end.x - ndx * this.node2.size;
        const endY = end.y - ndy * this.node2.size;

        // Draw line
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        if (this.text) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            ctx.save();
            ctx.translate(midX, midY);

            let angle = Math.atan2(dy, dx);
            if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
                angle += Math.PI;
            }

            ctx.rotate(angle);

            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '10px Arial';

            const textWidth = ctx.measureText(this.text).width;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(-textWidth / 2 - 5, -8, textWidth + 10, 16);

            ctx.fillStyle = '#000';
            ctx.fillText(this.text, 0, 0);

            ctx.restore();
        }
    }
}

const NetworkTab: React.FC<NetworkTabProps> = ({ questData, questId, loading, error }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [touchDistance, setTouchDistance] = useState(0);
    const [isTouching, setIsTouching] = useState(false);
    const [touchCenter, setTouchCenter] = useState({ x: 0, y: 0 });
    const animationRef = useRef<number>(0);

    // Create a ref to hold the current pan offset and zoom
    const panOffsetRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);

    // Update the refs whenever panOffset or zoom changes
    useEffect(() => {
        panOffsetRef.current = panOffset;
        zoomRef.current = zoomLevel;
    }, [panOffset, zoomLevel]);

    // Initialize the network when questData is loaded
    useEffect(() => {
        if (questData?.species_data_csv && canvasRef.current) {
            const canvas = canvasRef.current;
        if (!canvas) return;

        Papa.parse(questData.species_data_csv, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                const speciesData = results.data as SpeciesRow[];
                createNodes(speciesData);
            }
        });
        }
    }, [questData, questId]);


    // Updated createNodes function
    const createNodes = (speciesData: SpeciesRow[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const newNodes: Node[] = [];
        const width = canvas.width;
        const height = canvas.height;

        speciesData.forEach((species, index) => {
            const angle = (index / speciesData.length) * Math.PI * 2;
            const radius = Math.min(width, height) * 0.3;
            const x = width / 2 + radius * Math.cos(angle);
            const y = height / 2 + radius * Math.sin(angle);

            const imageSrc = species.image_name ? `${API_URL}/explore/images/${questId}/${species.image_name}` : '';

            const node = new Node(
                x,
                y,
                50,
                species['common_name'] || species['scientific_name'] || 'Unknown',
                species['scientific_name'] || '',
                species['taxonomic_group'] || '',
                imageSrc
            );

            newNodes.push(node);
        });

        let connections = createConnections(newNodes);

        startAnimation(newNodes, connections);
    };

    // Updated createConnections function with parameter
    const createConnections = (nodesToConnect: Node[] = nodes) => {
        // Create connections based on taxonomic groups or just connect all for now
        const newConnections: Connection[] = [];

        for (let i = 0; i < nodesToConnect.length; i++) {
            for (let j = i + 1; j < nodesToConnect.length; j++) {
                if (nodesToConnect[i].taxonomicGroup === nodesToConnect[j].taxonomicGroup && nodesToConnect[i].taxonomicGroup) {
                    const connection = new Connection(nodesToConnect[i], nodesToConnect[j], nodesToConnect[i].taxonomicGroup);
                    newConnections.push(connection);
                    nodesToConnect[i].connections.push(connection);
                    nodesToConnect[j].connections.push(connection);
                }
            }
        }

        return newConnections
    };

    const applyForces = (nodes, connections) => {
        const repulsionStrength = 0.02;
        const attractionStrength = 0.005;

        // Apply repulsive forces between nodes
        nodes.forEach((nodeA, i) => {
            nodes.slice(i + 1).forEach(nodeB => {
                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const minDistance = nodeA.size + nodeB.size + 50;

                if (distance < minDistance) {
                    const dirX = dx / distance;
                    const dirY = dy / distance;

                    const repulsionForce = repulsionStrength * (minDistance - distance);

                    nodeB.vx += dirX * repulsionForce;
                    nodeB.vy += dirY * repulsionForce;
                    nodeA.vx -= dirX * repulsionForce;
                    nodeA.vy -= dirY * repulsionForce;
                }
            });
        });

        // Apply attractive forces for connected nodes
        connections.forEach(connection => {
            const nodeA = connection.node1;
            const nodeB = connection.node2;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const idealDistance = nodeA.size + nodeB.size + 100;
            const diff = distance - idealDistance;

            if (Math.abs(diff) > 1) {
                const dirX = dx / distance;
                const dirY = dy / distance;

                const attractionForce = attractionStrength * diff;

                nodeB.vx -= dirX * attractionForce;
                nodeB.vy -= dirY * attractionForce;
                nodeA.vx += dirX * attractionForce;
                nodeA.vy += dirY * attractionForce;
            }
        });

        // Update node positions
        nodes.forEach(node => {
            if (node !== selectedNode || !isDragging) {
                node.update();
            }
        });
    };

    const startAnimation = (nodes, connections) => {
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

            // Use the ref values instead of the captured state values
            ctx.translate(panOffsetRef.current.x, panOffsetRef.current.y);
            ctx.scale(zoomRef.current, zoomRef.current);

            applyForces(nodes, connections);

            if(connections) {
                connections.forEach(connection => connection.draw(ctx));
            }

            // Draw nodes
            if(nodes) {
                nodes.forEach(node => node.draw(ctx));
            }

            ctx.restore();

            animationRef.current = requestAnimationFrame(animate);
        };

        setNodes(nodes);
        setConnections(connections);
        animate();
    };

    // Get canvas coordinates from screen coordinates
    const getCanvasCoordinates = (screenX: number, screenY: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const x = (screenX - rect.left - panOffset.x) / zoomLevel;
        const y = (screenY - rect.top - panOffset.y) / zoomLevel;
        return { x, y };
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

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsPanning(false);
        setSelectedNode(null);
    };

    // Touch event handlers
    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
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
        e.preventDefault();
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
                const newZoom = Math.max(0.5, Math.min(3, zoomLevel * scale));
                
                // Get canvas coordinates for pinch center
                const canvas = canvasRef.current;
                if (canvas) {
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
            }
            setTouchDistance(distance);
            
            // Update touch center for next frame
            const centerX = (touch1.clientX + touch2.clientX) / 2;
            const centerY = (touch1.clientY + touch2.clientY) / 2;
            setTouchCenter({ x: centerX, y: centerY });
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsTouching(false);
        setIsDragging(false);
        setIsPanning(false);
        setSelectedNode(null);
        setTouchDistance(0);
        setTouchCenter({ x: 0, y: 0 });
    };

    // Mouse wheel zoom from cursor position
    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        
        // Get mouse position relative to canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Calculate zoom factor
        const delta = e.deltaY * -0.01;
        const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
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

    // Zoom controls - center of canvas
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
        
        const newZoom = Math.max(0.5, zoomLevel * 0.8);
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

    useEffect(() => {
        if (nodes.length > 0) {
            createConnections();
        }
    }, [nodes]);

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

    if (!questData?.species_data_csv) {
        return <div className="p-4">No species data available for network visualization</div>;
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
                <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
                    <button
                        onClick={handleZoomIn}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        title="Zoom In"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                        title="Zoom Out"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                        </svg>
                    </button>
                    <button
                        onClick={handleResetZoom}
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
            </div>
        </div>
    );
};

export default NetworkTab;