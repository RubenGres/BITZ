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
    questDataDict: Record<string, any>;
    questId: string;
    loading: boolean;
    error: string | null;
}

interface SpeciesInfo {
    name: string;
    what_is_it: string;
    information: string;
    image_filename: string;
    image_location?: string;
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
    image_filename: string;
    quest_id: string;
    user_id: string;
    species_info: SpeciesInfo;
    timestamp: number;
    selected: boolean;

    constructor(x: number, y: number, size: number, name: string, scientificName: string, taxonomicGroup: string, imageSrc: string, image_filename: string, quest_id: string, user_id: string, species_info: SpeciesInfo, timestamp: number) {
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
        this.image_filename = image_filename;
        this.quest_id = quest_id;
        this.user_id = user_id;
        this.species_info = species_info;
        this.timestamp = timestamp;
        this.selected = false;

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

        const radius = this.selected ? this.size * 1.1 : this.size;
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);

        if (this.image) {
            // Create circular clipping
            ctx.save();
            ctx.clip(); // Clip to the circle path

            // Draw image within the clipped area
            const imageSize = radius * 2;
            ctx.drawImage(this.image, this.x - radius, this.y - radius, imageSize, imageSize);
            ctx.restore(); // Restore context after clipping and image drawing

            // Draw stroke around the circle
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = this.selected ? 10 : 2;
            ctx.stroke();
        } else {
            // Default appearance
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = '#000000';
            ctx.lineWidth = this.selected ? 10 : 2;
            ctx.stroke();
            ctx.fill();
        }

        // Draw label
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = '12px Arial';
        ctx.fillText(this.name, this.x, this.y + radius + 10);
    }

    contains(x: number, y: number): boolean {
        const distance = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        return distance <= this.size;
    }

    update_image(imageSrc: string) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        this.imageSrc = imageSrc;
        img.onload = () => {
            this.image = img;
        };
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
        ctx.lineWidth = 10;
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

// Species Info Panel Component
const SpeciesInfoPanel = ({ questId, species, isOpen, onClose, isMobile = false }) => {
    if (!species) return null;

    return (
        <div
            className={`fixed bg-black text-white shadow-xl transition-all duration-300 ease-in-out z-50 border-l border-white
                ${isMobile
                    ? `bottom-0 left-0 right-0 rounded-t-xl ${isOpen ? 'h-4/5' : 'h-0'}`
                    : `top-0 right-0 h-full ${isOpen ? 'w-96' : 'w-0'}`
                }`}
        >
            {isOpen && (
                <div className="flex flex-col h-full">
                    {/* Header with close button */}
                    <div className="flex justify-between items-center p-4 border-b border-white">
                        <h2 className="text-xl font-bold truncate">{species.name}</h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-gray-800 text-white"
                            aria-label="Close panel"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {species.image_filename && (
                            <div className="mb-4">
                                <img
                                    src={`${API_URL}/explore/images/${questId}/${species.image_filename}`}
                                    alt={species.name}
                                    className="w-full object-cover rounded-lg mb-2"
                                />
                            </div>
                        )}

                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">Description</h3>
                            <p className="text-white">{species.what_is_it}</p>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">Additional Information</h3>
                            <p className="text-white">{species.information}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const NetworkTab: React.FC<NetworkTabProps> = ({ questDataDict, loading, error }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panOffset, setPanOffset] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(0.5);
    const [touchDistance, setTouchDistance] = useState(0);
    const [touchCenter, setTouchCenter] = useState({ x: 0, y: 0 });

    const animationRef = useRef<number>(0);
    const isAnimationRunningRef = useRef<boolean>(false);
    const hasProcessedData = useRef(false);

    // State for the sliding info panel
    const [selectedSpecies, setSelectedSpecies] = useState<SpeciesInfo | null>(null);
    const [questId, setQuestId] = useState("")
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Create a ref to hold the current pan offset and zoom
    const panOffsetRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const nodesRef = useRef<Node[]>([]);
    const connectionsRef = useRef<Connection[]>([]);

    useEffect(() => {
        console.log("Processing quest data");

        // Create temporary array to hold all nodes before sorting
        let allNodes: Node[] = [];

        if (hasProcessedData.current) {
            return;
        }

        hasProcessedData.current = true;

        // Function to add nodes with delay
        const addNodesWithDelay = (sortedNodes: Node[]) => {
            setNodes([]); // Clear existing nodes

            if (sortedNodes.length === 0) return;

            let currentIndex = 0;

            const addNextNode = () => {
                if (currentIndex < sortedNodes.length) {
                    const new_node = sortedNodes[currentIndex];

                    const same_species_node = checkForExistingNode(new_node);

                    if (same_species_node) {
                        const older_node_userid = sortedNodes.slice(0, currentIndex).filter(node => node.user_id === new_node.user_id).pop();
                        const connection = new Connection(same_species_node, older_node_userid, "");

                        same_species_node.update_image(new_node.imageSrc)
                        older_node_userid.connections.push(connection);
                        same_species_node.connections.push(connection);
                        setConnections(prevConnections => [...prevConnections, connection]);

                        same_species_node.size += 30;
                    } else {
                        addConnectionsUserId(new_node);
                        setNodes(prevNodes => [...prevNodes, new_node]);
                    }

                    currentIndex++;

                    // Calculate delay based on timestamps
                    let delay = 20; // Default delay

                    if (currentIndex < sortedNodes.length) {
                        // Get timestamp of next node
                        const nextTimestamp_ms = sortedNodes[currentIndex].timestamp * 1000;
                        const currentTimestamp_ms = new_node.timestamp * 1000;
                        const timeDiff = nextTimestamp_ms - currentTimestamp_ms;
                        delay = timeDiff / 100;
                    }

                    setTimeout(addNextNode, delay);
                }
            };

            // Start adding nodes
            addNextNode();
        };

        // Process the data from all CSVs
        Object.entries(questDataDict).forEach(([questId, questData]) => {
            Papa.parse(questData.species_data_csv, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const speciesData = results.data as SpeciesRow[];
                    const newNodes = createNodes(speciesData, questId);
                    if (newNodes) {
                        allNodes = [...allNodes, ...newNodes];
                    }
                }
            });
        });

        allNodes.sort((a, b) => a.timestamp - b.timestamp);
        addNodesWithDelay(allNodes);

    }, []); // Only depends on questDataDict

    useEffect(() => {
        startAnimation();

        // Cleanup animation on unmount
        return () => {
            isAnimationRunningRef.current = false;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    useEffect(() => {
        panOffsetRef.current = panOffset;
        zoomRef.current = zoomLevel;
    }, [panOffset, zoomLevel]);

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // Check for mobile device on mount
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);

        return () => {
            window.removeEventListener('resize', checkIfMobile);
        };
    }, []);

    const findInfo = (image_filename: string, quest_id: string) => {
        const questData = questDataDict[quest_id];

        if (!questData?.history || !image_filename) {
            console.warn('No history data or image filename');
            return null;
        }

        let user_id = questData.user_id;

        const historyItem = questData.history.find(item =>
            item.image_filename === image_filename
        );

        if (!historyItem || !historyItem.assistant) {
            console.warn('No matching history item or assistant data');
            return null;
        }

        let timestamp = historyItem.timestamp;

        let species_info: SpeciesInfo = {
            name: "Default Name",
            what_is_it: "Description",
            information: "More info",
            image_filename: historyItem.image_filename,
            image_location: historyItem.image_location
        };;

        try {
            let fixedJsonStr = historyItem.assistant
                .replace(/'/g, '"')
                .replace(/\\"/g, '\\"');

            // Parse the fixed JSON string
            const assistantData = JSON.parse(fixedJsonStr);

            if (assistantData.species_identification) {
                species_info = {
                    name: assistantData.species_identification.name,
                    what_is_it: assistantData.species_identification.what_is_it,
                    information: assistantData.species_identification.information,
                    image_filename: historyItem.image_filename,
                    image_location: historyItem.image_location
                };
            } else {
                console.warn('No species_identification field in assistant data');
            }
        } catch (e) {
            // console.error("Error parsing assistant data:", e);
            // console.error("Error details:", e.message);
            // console.log("Full assistant data:", historyItem.assistant);
        }

        return {
            species_info: species_info,
            timestamp: timestamp,
            user_id: user_id
        };
    };

    const createNodes = (speciesData: SpeciesRow[], questId: string) => {
        console.log('Creating nodes for quest id:', questId);
        console.log('Species data len:', speciesData.length);

        const canvas = canvasRef.current;
        if (!canvas) return;

        const newNodes: Node[] = [];
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        speciesData.forEach((species, index) => {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.min(width, height) * 0.3;

            const x = 0
            const y = 0

            console.log("DEFAUL", x, y)

            const imageSrc = species.image_name ? `${API_URL}/explore/images/${questId}/${species.image_name}` : '';

            let imageFilename = species.image_name || '';

            // If the image filename contains a path, extract just the filename part
            if (imageFilename.includes('/')) {
                imageFilename = imageFilename.split('/').pop() || '';
            }

            const info = findInfo(imageFilename, questId)

            const node = new Node(
                x,
                y,
                50,
                species['common_name'] || species['scientific_name'] || 'Unknown',
                species['scientific_name'] || '',
                species['taxonomic_group'] || '',
                imageSrc,
                imageFilename,
                questId,
                info['user_id'],
                info['species_info'],
                info['timestamp']
            );

            newNodes.push(node);
        });

        return newNodes;
    };

    const checkForExistingNode = (new_node: Node) => {
        const currentNodes = nodesRef.current

        const existingNode = currentNodes.find(node => node.name == new_node.name);

        return existingNode
    };

    // Updated createConnections function with parameter
    const addConnectionsUserId = (new_node: Node) => {
        const newConnections: Connection[] = [];
        const currentNodes = nodesRef.current;

        for (let i = currentNodes.length - 1; i >= 0; i--) {
            if (currentNodes[i].user_id == new_node.user_id) {
                const connection = new Connection(currentNodes[i], new_node, "");
                newConnections.push(connection);

                const randomAngle = Math.random() * 2 * Math.PI;

                // Calculate the x and y coordinates on the circle
                new_node.x = currentNodes[i].x + (new_node.size * Math.cos(randomAngle));
                new_node.y = currentNodes[i].y + (new_node.size * Math.sin(randomAngle));
                currentNodes[i].connections.push(connection);

                new_node.connections.push(connection);

                break;
            }
        }

        setConnections(prevConnections => [...prevConnections, ...newConnections]);
        return newConnections
    };

    const applyForces = (nodes, connections) => {
        const repulsionStrength = 0.002;
        const attractionStrength = 0.005;

        // Apply repulsive forces between nodes
        // Use squared distances to avoid square root calculations
        nodes.forEach((nodeA, i) => {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];

                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distanceSquared = dx * dx + dy * dy;

                const minDistance = nodeA.size + nodeB.size + 50;
                const minDistanceSquared = minDistance * minDistance;

                if (distanceSquared < minDistanceSquared) {
                    // Only calculate square root once when needed
                    let distance = Math.sqrt(distanceSquared);
                    if (distance == 0) {
                        distance = 0.001
                    }
                    const dirX = dx / distance;
                    const dirY = dy / distance;

                    const repulsionForce = repulsionStrength * (minDistance - distance);

                    nodeB.vx += dirX * repulsionForce;
                    nodeB.vy += dirY * repulsionForce;
                    nodeA.vx -= dirX * repulsionForce;
                    nodeA.vy -= dirY * repulsionForce;
                }
            }
        });

        // Apply attractive forces for connected nodes with optimization
        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            const nodeA = connection.node1;
            const nodeB = connection.node2;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distanceSquared = dx * dx + dy * dy;

            const idealDistance = nodeA.size + nodeB.size + 100;
            const idealDistanceSquared = idealDistance * idealDistance;

            // Only calculate exact distance if we need to apply a force
            if (Math.abs(distanceSquared - idealDistanceSquared) > idealDistance) {
                const distance = Math.sqrt(distanceSquared);
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
            }
        }

        // Update node positions (using regular for loop)
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node !== selectedNode || !isDragging) {
                node.update();
            }
        }
    };

    const startAnimation = () => {
        // Only start if not already running
        if (isAnimationRunningRef.current) return;

        isAnimationRunningRef.current = true;
        console.log("Starting animation loop");

        const animate = () => {
            const currentNodes = nodesRef.current;
            const currentConnections = connectionsRef.current;

            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('Canvas context not available');
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            ctx.save();

            ctx.translate(panOffsetRef.current.x, panOffsetRef.current.y);
            ctx.scale(zoomRef.current, zoomRef.current);

            applyForces(currentNodes, currentConnections);

            if (currentConnections) {
                currentConnections.forEach(connection => connection.draw(ctx));
            }

            // Draw nodes
            if (currentNodes) {
                currentNodes.forEach(node => node.draw(ctx));
            }

            ctx.restore();

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();
    };

    // Handle node click to show info panel
    const handleNodeClick = (node: Node) => {
        console.log('Node clicked:', node.quest_id);

        const speciesInfo = node.species_info
        //const speciesInfo = null;

        if (speciesInfo) {
            setQuestId(node.quest_id);
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
            clickedNode.selected = true;
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

        if (selectedNode) {
            const tolerance = 10;
            let hasMovedSinceClick = Math.abs(dragOffset.x - (selectedNode.x - x)) > tolerance ||
                Math.abs(dragOffset.y - (selectedNode.y - y)) > tolerance;
            if (!hasMovedSinceClick) {
                handleNodeClick(selectedNode);
            }
        }

        setIsDragging(false);
        setIsPanning(false);

        if (selectedNode) {
            selectedNode.selected = false;
            setSelectedNode(null);
        }
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
                clickedNode.selected = true;
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
        // Check if there was a tap on a node (quick touch without much movement)
        if (selectedNode && !isPanning && !isDragging) {
            handleNodeClick(selectedNode);
        }

        setIsTouching(false);
        setIsDragging(false);
        setIsPanning(false);
        if (selectedNode) {
            selectedNode.selected = false;
            setSelectedNode(null);
        }
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
    }, []);

    // Cleanup animation on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">Error: {error}</div>;
    }

    return (
        <div className="flex flex-col h-full w-full"> {/* Changed from h-[70vh] to h-full */}
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
                {/* <div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
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
                </div> */}

                {/* Zoom level indicator */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {Math.round(zoomLevel * 100)}%
                </div>

                {/* Species Info Panel */}
                <SpeciesInfoPanel
                    questId={questId}
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