import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import JSON5 from 'json5';
import { API_URL } from '@/app/Constants';
import { applyGlobalFilters } from '@/app/utils/dataFilters'; // 👈 NEW IMPORT for filtering

const global_parameters = {
    interaction_mode: "final", // "auto" or "explore" or "final"
    image_quality: "thumb", // "icon", "thumb", "medium", "large", "full"
    connection_type: "user_id", // "user_id" or "species"
    cutoff_time: 99999999999999999, // maximum timestamp to display nodes
    delay_add_max_ms: 20, // don't wait for more than 
    delay_add_min_ms: 2, // wait at least
    delay_rem_ms: 50,
    real_time_scaling: 250, // real time speed multiplier 
    spawning_node_radius: 0.3, // factor of the size of the screen
    delay_wait_for_rem_ms: 120e3, // 2 minutes
    delay_wait_for_add_ms: 0, // 3 seconds
    attraction_force: 0.02,
    repulsion_force: 0.005,
    node_size_min_px: 50,
    node_size_max_px: 999999999, // no size max
    node_scaling_factor: 1.08,
    node_damping: 0.95,
    node_border_radius_px: 2,
    node_selected_border_radius_px: 10,
    node_label_font: '12px Arial',
    node_label_color: '#000',
    ideal_node_distance: 400, // margin between node, ideally
    show_labels: true, // whether to show connection labels, this will also the labels from the server which can be slow
    connection_width: 2,
    zoom_factor: 0.001,
    min_zoom: 0.1,
    max_zoom: 4,
}

interface SpeciesRow {
    'image_name': string;
    'taxonomic_group': string;
    'scientific_name': string;
    'common_name': string;
    'discovery_timestamp': string;
    'confidence': string;
    'notes': string;
    'latitude': string; // Needed for filtering
    'longitude': string; // Needed for filtering
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
    image_src: string;
}

const imageCacheNodes = {};
const imageCachePanel = {};
const connectionLabelCache = {};

const addConnectionsSpecies = async (newNode: Node, existingNodes: Node[]) => {
    const newConnections: Connection[] = [];

    // Find nodes with the same taxonomic group
    const sameGroupNodes = existingNodes.filter(node =>
        node.taxonomicGroup === newNode.taxonomicGroup &&
        node.name !== newNode.name
    );

    // Connect to a few similar species (limit to avoid too many connections)
    const maxConnections = Math.min(3, sameGroupNodes.length);
    for (let i = 0; i < maxConnections; i++) {
        const targetNode = sameGroupNodes[i];
        const connection = new Connection(newNode, targetNode, "", "#4CAF50");
        newConnections.push(connection);

        // Position new node near the connected node
        if (i === 0) {
            const randomAngle = Math.random() * 2 * Math.PI;
            const distance = global_parameters.ideal_node_distance * 0.8;
            newNode.x = targetNode.x + (distance * Math.cos(randomAngle));
            newNode.y = targetNode.y + (distance * Math.sin(randomAngle));
        }

        targetNode.connections.push(connection);
        newNode.connections.push(connection);
    }

    return newConnections;
};

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
    imageLoaded: boolean;

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
        this.imageLoaded = false;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Damping
        this.vx *= global_parameters.node_damping;
        this.vy *= global_parameters.node_damping;
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Load the image on first draw
        if (!this.imageLoaded && this.imageSrc) {
            this.loadImage();
        }

        ctx.beginPath();

        const radius = this.selected ? this.size * global_parameters.node_scaling_factor : this.size;
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
            ctx.lineWidth = this.selected ? global_parameters.node_selected_border_radius_px : global_parameters.node_border_radius_px;
            ctx.stroke();
        } else {
            // Default appearance
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = this.selected ? global_parameters.node_selected_border_radius_px : global_parameters.node_border_radius_px;
            ctx.stroke();
            ctx.fillStyle = "#fff"
            ctx.fill();
        }

        // Draw label
        ctx.fillStyle = global_parameters.node_label_color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = global_parameters.node_label_font;
        ctx.fillText(this.name, this.x, this.y + radius + 10);
    }

    contains(x: number, y: number): boolean {
        const distance = Math.sqrt((this.x - x) ** 2 + (this.y - y) ** 2);
        return distance <= this.size;
    }
    loadImage() {
        // console.log(imageCacheNodes)
        // Check if this image is already in the cache
        let key = `${this.quest_id}${this.image_filename}`
        console.log("Looking in cache for", key)
        console.log("cache", imageCacheNodes)


        if (imageCacheNodes[key]) {
            console.log("image is cached!")
            this.image = imageCacheNodes[key];
            this.imageLoaded = true;
            return;
        }

        // If not in cache, load it
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = this.imageSrc;
        img.onload = () => {
            this.image = img;
            // Store in cache for future use
            imageCacheNodes[key] = img;
        };
        this.imageLoaded = true; // Mark as loaded to prevent multiple load attempts
    }

    update_image(imageKey: string, imageSrc: string) {
        // Only update if the source has changed
        if (this.imageSrc !== imageSrc) {
            this.imageSrc = imageSrc;

            if (imageCacheNodes[imageKey]) {
                this.image = imageCacheNodes[imageKey];
            } else {
                this.image = null;
                this.imageLoaded = false; // Reset flag to trigger load on next draw
            }
        }
    }
}

const fetchSpeciesLinkBatch = async (speciesPairs: string[][]): Promise<{ [key: string]: string }> => {
    try {
        const response = await fetch(`${API_URL}/link_species_batch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                species_pairs: speciesPairs
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const results: { [key: string]: string } = {};

        // Process results and cache them
        data.results.forEach((result: any) => {
            if (result.pair && result.pair.length === 2) {
                // Create consistent cache key
                const cacheKey = result.pair.sort().join('|');
                const link = result.link || '';
                
                // Cache the result
                connectionLabelCache[cacheKey] = link;
                results[cacheKey] = link;
            }
        });

        return results;
    } catch (error) {
        console.error('Error fetching species links in batch:', error);
        return {};
    }
};

class Connection {
    node1: Node;
    node2: Node;
    text: string;
    color: string;
    labelPromise: Promise<string> | null;
    isLabelLoading: boolean;
    
    // Add static properties for batch processing
    static pendingConnections: Connection[] = [];
    static batchTimer: NodeJS.Timeout | null = null;
    static readonly BATCH_DELAY = 100; // Wait 100ms to collect more connections

    constructor(node1: Node, node2: Node, text: string = '', color: string = "#888") {
        this.node1 = node1;
        this.node2 = node2;
        this.text = text;
        this.color = color;
        this.labelPromise = null;
        this.isLabelLoading = false;

        if (global_parameters.show_labels && node1.name && node2.name && node1.name !== node2.name) {
            this.requestConnectionLabel();
        }
    }

    requestConnectionLabel() {
        const cacheKey = [this.node1.name, this.node2.name].sort().join('|');
        
        // Check cache first
        if (connectionLabelCache[cacheKey]) {
            this.text = connectionLabelCache[cacheKey];
            return;
        }

        // Add to pending batch
        Connection.pendingConnections.push(this);
        this.isLabelLoading = true;

        // Clear existing timer and set new one
        if (Connection.batchTimer) {
            clearTimeout(Connection.batchTimer);
        }

        Connection.batchTimer = setTimeout(() => {
            Connection.processBatch();
        }, Connection.BATCH_DELAY);
    }

    static async processBatch() {
        if (Connection.pendingConnections.length === 0) return;

        // Get unique species pairs from pending connections
        const speciesPairs: string[][] = [];
        const connectionMap = new Map<string, Connection[]>();

        Connection.pendingConnections.forEach(connection => {
            const pair = [connection.node1.name, connection.node2.name];
            const cacheKey = pair.sort().join('|');
            
            // Only add if not already in cache
            if (!connectionLabelCache[cacheKey]) {
                // Check if we already have this pair in our batch
                if (!connectionMap.has(cacheKey)) {
                    speciesPairs.push([connection.node1.name, connection.node2.name]);
                    connectionMap.set(cacheKey, []);
                }
                connectionMap.get(cacheKey)!.push(connection);
            } else {
                // Use cached result
                connection.text = connectionLabelCache[cacheKey];
                connection.isLabelLoading = false;
            }
        });

        // Clear pending connections
        Connection.pendingConnections = [];

        // If no new pairs to fetch, we're done
        if (speciesPairs.length === 0) return;

        console.log(`Fetching labels for ${speciesPairs.length} species pairs in batch`);

        try {
            // Fetch all labels in batch
            const results = await fetchSpeciesLinkBatch(speciesPairs);

            // Update all connections with their labels
            connectionMap.forEach((connections, cacheKey) => {
                const label = results[cacheKey] || '';
                connections.forEach(connection => {
                    connection.text = label;
                    connection.isLabelLoading = false;
                });
            });

        } catch (error) {
            console.error('Batch label fetching failed:', error);
            // Mark all connections as failed
            connectionMap.forEach((connections) => {
                connections.forEach(connection => {
                    connection.text = '';
                    connection.isLabelLoading = false;
                });
            });
        }
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
        ctx.strokeStyle = this.color;
        ctx.lineWidth = global_parameters.connection_width;
        ctx.stroke();

        // Draw text (including loading indicator)
        if (this.text || this.isLabelLoading) {
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

            const displayText = this.text || (this.isLabelLoading ? '...' : '');
            const textWidth = ctx.measureText(displayText).width;

            // Background for text
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(-textWidth / 2 - 5, -8, textWidth + 10, 16);

            // Text
            ctx.fillStyle = this.isLabelLoading ? '#666' : '#000';
            ctx.fillText(displayText, 0, 0);

            ctx.restore();
        }
    }
}

interface SpeciesInfoProps {
    name: string;
    description: string;
    information: string;
    image_src: string;
    quest_id?: string;
    user_id?: string;
    image_filename?: string;
    isOpen: boolean;
    onClose: () => void;
    isMobile?: boolean;
}

const SpeciesInfoPanel = ({
    name,
    description,
    information,
    image_src,
    quest_id,
    user_id,
    image_filename,
    isOpen,
    onClose,
    isMobile = false
}: SpeciesInfoProps) => {
    const [imageLoading, setImageLoading] = useState<boolean>(true);
    const [imageError, setImageError] = useState<boolean>(false);
    const [cachedImage, setCachedImage] = useState<HTMLImageElement | null>(null);

    // Debug info
    useEffect(() => {
        if (isOpen) {
            console.log("Panel opened with props:", {
                name,
                image_src,
                quest_id,
                image_filename
            });
        }
    }, [isOpen, name, image_src, quest_id, image_filename]);

    // Load and cache the image when panel opens
    useEffect(() => {
        if (!isOpen || !image_src || !quest_id || !image_filename) return;

        setImageLoading(true);
        setImageError(false);

        // Create a cache key similar to the Node class
        const cacheKey = `${quest_id}${image_filename}`;
        console.log("Looking in panel cache for", cacheKey);

        // Check if image is already in cache
        if (imageCachePanel[cacheKey]) {
            console.log("Panel image is cached!");
            setCachedImage(imageCachePanel[cacheKey]);
            setImageLoading(false);
            return;
        }

        // If not in cache, load it
        console.log("Loading image for panel:", image_src);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = image_src;

        img.onload = () => {
            console.log("Panel image loaded successfully");
            // Store in cache for future use
            imageCachePanel[cacheKey] = img;
            setCachedImage(img);
            setImageLoading(false);
        };

        img.onerror = (e) => {
            console.error("Failed to load panel image:", e);
            setImageError(true);
            setImageLoading(false);
        };
    }, [isOpen, image_src, quest_id, image_filename]);

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
                        <h2 className="text-xl font-bold truncate">{name}</h2>
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
                        {image_src && (
                            <div className="mb-4 relative min-h-[200px] flex items-center justify-center">
                                {imageLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                                    </div>
                                )}

                                {!imageError && cachedImage && (
                                    <img
                                        src={cachedImage.src}
                                        alt={name}
                                        className="w-full object-cover rounded-lg mb-2"
                                    />
                                )}

                                {imageError && (
                                    <div className="bg-red-900 text-white p-4 rounded text-center">
                                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Failed to load image. The URL may be invalid or the image cannot be accessed.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">Description</h3>
                            <p className="text-white">{description || "No description available."}</p>
                        </div>

                        <div className="mb-4">
                            <h3 className="font-semibold text-lg mb-1">Additional Information</h3>
                            <p className="text-white">{information || "No additional information available."}</p>
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
    const [isTouching, setIsTouching] = useState(false);
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
    const [focusedSpeciesInfo, setFocusedSpeciesInfo] = useState<SpeciesInfo | null>(null);
    const [focusedNode, setFocusedNode] = useState<Node | null>(null);
    const [questId, setQuestId] = useState("")
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Create a ref to hold the current pan offset and zoom
    const panOffsetRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const nodesRef = useRef<Node[]>([]);
    const connectionsRef = useRef<Connection[]>([]);
    
    // MODIFIED useEffect to handle asynchronous parsing and filtering
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);
    
    useEffect(() => {
        if (hasProcessedData.current) {
            return;
        }

        hasProcessedData.current = true;

        // Function to add nodes with delay
        const addNodesWithDelay = (
            sortedNodes: Node[],
            onComplete?: () => void
        ) => {
            setNodes([]);

            if (sortedNodes.length === 0) {
                if (onComplete) onComplete();
                return;
            }

            let currentIndex = 0;

            const addNextNode = async () => {
                if (currentIndex < sortedNodes.length) {
                    const new_node = sortedNodes[currentIndex];

                    const same_species_node = checkForExistingNode(new_node);

                    if (same_species_node) {
                        const older_node_userid = sortedNodes.slice(0, currentIndex).filter(node => node.user_id === new_node.user_id).pop();

                        let new_key = `${new_node.quest_id}${new_node.image_filename}`
                        same_species_node.update_image(new_key, new_node.imageSrc)

                        if (older_node_userid) {
                            let color = get_user_id_color(new_node.user_id)
                            const connection = new Connection(same_species_node, older_node_userid, "", color);
                            older_node_userid.connections.push(connection);
                            same_species_node.connections.push(connection);
                            setConnections(prevConnections => [...prevConnections, connection]);
                        }

                        // scaling the node
                        same_species_node.size = Math.min(same_species_node.size * global_parameters.node_scaling_factor, global_parameters.node_size_max_px);
                    } else {
                        if (global_parameters.connection_type === "user_id") {
                            addConnectionsUserId(new_node);
                        } else if (global_parameters.connection_type === "species") {
                            const currentNodes = nodesRef.current;
                            const newConnections = await addConnectionsSpecies(new_node, currentNodes);
                            setConnections(prevConnections => [...prevConnections, ...newConnections]);
                        }

                        setNodes(prevNodes => [...prevNodes, new_node]);

                        // fake a click for the display panel
                        if (global_parameters.interaction_mode === "auto") {
                            handleNodeClick(new_node);
                        }
                    }

                    currentIndex++;

                    // Calculate delay based on interaction mode
                    let delay = global_parameters.delay_add_min_ms;

                    // In "final" mode, add all nodes immediately (no delay)
                    if (global_parameters.interaction_mode === "final") {
                        delay = 0;
                    } else if (currentIndex < sortedNodes.length) {
                        // Get timestamp of next node
                        const nextTimestamp_ms = sortedNodes[currentIndex].timestamp * 1000;
                        const currentTimestamp_ms = new_node.timestamp * 1000;
                        const timeDiff = nextTimestamp_ms - currentTimestamp_ms;

                        delay = Math.min(timeDiff / global_parameters.real_time_scaling, global_parameters.delay_add_max_ms);
                    }

                    setTimeout(addNextNode, delay);
                } else if (onComplete) {
                    onComplete();
                }
            };

            // Start adding nodes
            addNextNode();
        };


        // Function to remove nodes with delay
        const removeNodesWithDelay = (
            nodesToRemove: Node[],
            onComplete?: () => void
        ) => {
            // In "final" mode, don't remove nodes - keep the final state
            if (global_parameters.interaction_mode === "final") {
                if (onComplete) onComplete();
                return;
            }

            if (nodesToRemove.length === 0) {
                if (onComplete) onComplete();
                return;
            }

            let currentIndex = nodesToRemove.length - 1;

            const removeNextNode = () => {
                if (currentIndex >= 0) {
                    const nodeToRemove = nodesToRemove[currentIndex];

                    // Reset size
                    nodeToRemove.size = global_parameters.node_size_min_px

                    // First, remove all connections associated with this node
                    setConnections(prevConnections =>
                        prevConnections.filter(connection =>
                            connection.node1 !== nodeToRemove &&
                            connection.node2 !== nodeToRemove
                        )
                    );

                    // Also update the connections array in each connected node
                    nodesToRemove.forEach(node => {
                        if (node !== nodeToRemove) {
                            node.connections = node.connections.filter(
                                connection =>
                                    connection.node1 !== nodeToRemove &&
                                    connection.node2 !== nodeToRemove
                            );
                        }
                    });

                    // Then remove the node itself
                    setNodes(prevNodes => prevNodes.filter(node => node !== nodeToRemove));

                    currentIndex--;

                    let delay = global_parameters.delay_rem_ms;

                    setTimeout(removeNextNode, delay);
                } else if (onComplete) {
                    onComplete();
                }
            };

            // Start removing nodes
            removeNextNode();
        };
        
        // Function to start the visualization cycle
        function startCycle(allNodes: Node[]) {
            // In "final" mode, show all data immediately without cycling
            if (global_parameters.interaction_mode === "final") {
                // Add all nodes at once without delay
                addAllNodesAtOnce(allNodes);
                return; // Don't start the removal cycle
            }

            // Original cycling behavior for "auto" and "explore" modes
            setTimeout(() => {
                addNodesWithDelay(allNodes, function () {
                    setTimeout(() => {
                        removeNodesWithDelay(allNodes, () => startCycle(allNodes)); // Recursive call to restart cycle
                    }, global_parameters.delay_wait_for_rem_ms);
                });
            }, global_parameters.delay_wait_for_add_ms)
        }

        // Function to add all nodes immediately
        const addAllNodesAtOnce = async (sortedNodes: Node[]) => {
            const finalNodes: Node[] = [];
            const finalConnections: Connection[] = [];

            for (const new_node of sortedNodes) {
                const same_species_node = finalNodes.find(node => node.name === new_node.name);

                if (same_species_node) {
                    const older_node_userid = finalNodes.filter(node => node.user_id === new_node.user_id).pop();

                    let new_key = `${new_node.quest_id}${new_node.image_filename}`
                    same_species_node.update_image(new_key, new_node.imageSrc)

                    if (older_node_userid) {
                        let color = get_user_id_color(new_node.user_id)
                        const connection = new Connection(same_species_node, older_node_userid, "", color);
                        older_node_userid.connections.push(connection);
                        same_species_node.connections.push(connection);
                        finalConnections.push(connection);
                    }

                    // scaling the node
                    same_species_node.size = Math.min(same_species_node.size * global_parameters.node_scaling_factor, global_parameters.node_size_max_px);
                } else {
                    if (global_parameters.connection_type === "user_id") {
                        // Add connections to existing nodes in finalNodes array
                        for (let i = finalNodes.length - 1; i >= 0; i--) {
                            if (finalNodes[i].user_id === new_node.user_id) {
                                let color = get_user_id_color(new_node.user_id)
                                const connection = new Connection(finalNodes[i], new_node, "", color);
                                finalConnections.push(connection);

                                const randomAngle = Math.random() * 2 * Math.PI;

                                // Calculate the x and y coordinates on the circle
                                new_node.x = finalNodes[i].x + (new_node.size * Math.cos(randomAngle));
                                new_node.y = finalNodes[i].y + (new_node.size * Math.sin(randomAngle));
                                finalNodes[i].connections.push(connection);
                                new_node.connections.push(connection);

                                break;
                            }
                        }
                    } else if (global_parameters.connection_type === "species") {
                        // Add species-based connections
                        const newConnections = await addConnectionsSpecies(new_node, finalNodes);
                        finalConnections.push(...newConnections);
                    }

                    finalNodes.push(new_node);
                }
            }

            // Set all nodes and connections at once
            setNodes(finalNodes);
            setConnections(finalConnections);
        };
        
        // --- NEW ASYNC PARSING AND FILTERING STARTS HERE ---
        const parseAndFilterData = async () => {
            const parsePromises: Promise<Node[] | null>[] = Object.entries(questDataDict).map(([questId, questData]) => {
                return new Promise(resolve => {
                    if (!questData?.species_data_csv) {
                        return resolve(null);
                    }
                    
                    Papa.parse(questData.species_data_csv, {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            const speciesData = results.data as SpeciesRow[];
                            // Filtering is now inside createNodes, which ensures filtering happens
                            // on the data that still contains latitude/longitude.
                            const newNodes = createNodes(speciesData, questId);
                            resolve(newNodes || null);
                        },
                        error: (error) => {
                            console.error(`Error parsing CSV for quest ${questId}:`, error);
                            resolve(null);
                        }
                    });
                });
            });

            // Wait for all CSVs to be parsed (and filtered within createNodes)
            const results = await Promise.all(parsePromises);
            
            // Consolidate all parsed and filtered nodes
            let allNodes = results.flatMap(nodes => nodes || []);

            console.log("Nodes before timestamp cutoff:", allNodes.length);

            if (allNodes.length > 0) {
                allNodes = allNodes.filter((node) => node.timestamp < global_parameters.cutoff_time);
                allNodes.sort((a, b) => a.timestamp - b.timestamp);
            }

            console.log("Nodes after all filtering/sorting:", allNodes.length);

            // Start the visualization cycle
            startCycle(allNodes);
        };

        parseAndFilterData();

    }, [questDataDict]); // Added questDataDict as a dependency to re-run if input data changes

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
    // Create a cache object outside the function to persist between calls
    const colorCache: { [key: string]: string } = {};

    const get_user_id_color = (user_id: string): string => {
        if (colorCache[user_id]) {
            return colorCache[user_id];
        }

        let hash = 0;
        for (let i = 0; i < user_id.length; i++) {
            hash = user_id.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash) % 360;

        const saturation = 65; // Moderate saturation
        const lightness = 60;  // Medium-bright lightness

        const color = hslToHex(hue, saturation, lightness);

        colorCache[user_id] = color;

        return color;
    };

    // Helper function to convert HSL to hex
    const hslToHex = (h: number, s: number, l: number): string => {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;

        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };

        return `#${f(0)}${f(8)}${f(4)}`;
    };

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

        // Default values
        let species_info: SpeciesInfo = {
            name: "Name of the species",
            what_is_it: "Description",
            information: "More info",
            image_filename: historyItem.image_filename,
            image_src: ""
        };

        try {
            // better parsing with json5 lib, duh
            const assistantData = JSON5.parse(historyItem.assistant);

            if (assistantData.species_identification) {
                species_info.name = assistantData.species_identification.name
                species_info.what_is_it = assistantData.species_identification.what_is_it
                species_info.information = assistantData.species_identification.information
                species_info.image_filename = historyItem.image_filename
            } else {
                console.warn('No species_identification field in assistant data');
            }
        } catch (e) {
            // console.error("Error parsing assistant data:", e);
            // console.error("Error details:", e.message);
            console.log("Full assistant data:", historyItem.assistant);
        }

        return {
            species_info: species_info,
            timestamp: timestamp,
            user_id: user_id
        };
    };

    const createNodes = (speciesData: SpeciesRow[], questId: string) => {
        console.log('Creating nodes for quest id:', questId);
        
        // 🛑 APPLY FARM FILTER HERE
        const filteredSpeciesData = applyGlobalFilters(speciesData);
        console.log(`Species data for quest ${questId}: ${speciesData.length} raw, ${filteredSpeciesData.length} filtered.`);


        const canvas = canvasRef.current;
        if (!canvas) return;

        const newNodes: Node[] = [];
        const width = canvas.width || window.innerWidth;
        const height = canvas.height || window.innerHeight;

        // Use the filtered data to create nodes
        filteredSpeciesData.forEach((species, index) => {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.min(width, height) * global_parameters.spawning_node_radius;

            const x = width / 2 + radius * Math.cos(angle);
            const y = height / 2 + radius * Math.sin(angle);

            // image resolution
            const imageSrc = species.image_name ? `${API_URL}/explore/images/${questId}/${species.image_name}?res=${global_parameters.image_quality}` : '';

            let imageFilename = species.image_name || '';

            // If the image filename contains a path, extract just the filename part
            if (imageFilename.includes('/')) {
                imageFilename = imageFilename.split('/').pop() || '';
            }

            const info = findInfo(imageFilename, questId);
            if (info && info.species_info) {
                info.species_info.image_src = imageSrc;
            }

            const default_info = {
                name: "",
                what_is_it: "",
                information: "",
                image_filename: "",
                image_src: ""
            }

            const node = new Node(
                x,
                y,
                global_parameters.node_size_min_px,
                species['common_name'] || species['scientific_name'] || 'Unknown',
                species['scientific_name'] || '',
                species['taxonomic_group'] || '',
                imageSrc,
                imageFilename,
                questId,
                info ? info['user_id'] : "",
                info ? info['species_info'] : default_info,
                info ? info['timestamp'] : 0
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
                let color = get_user_id_color(new_node.user_id)
                const connection = new Connection(currentNodes[i], new_node, "", color);
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
        const repulsionStrength = global_parameters.attraction_force;
        const attractionStrength = global_parameters.repulsion_force;

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
                    let dirX: number, dirY: number;
                    if (distance !== 0) {
                        dirX = dx / distance;
                        dirY = dy / distance;
                    } else {
                        // If distance is zero, use arbitrary direction to unstuck nodes
                        dirX = 0.05;
                        dirY = 0.05;
                    }

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

            if (!nodeA || !nodeB) {
                continue;
            }

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const distanceSquared = dx * dx + dy * dy;

            const idealDistance = nodeA.size + nodeB.size + global_parameters.ideal_node_distance;
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
            setFocusedSpeciesInfo(speciesInfo);
            setFocusedNode(node)
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
        const delta = e.deltaY * -1 * global_parameters.zoom_factor;
        const newZoom = Math.max(global_parameters.min_zoom, Math.min(global_parameters.max_zoom, zoomLevel + delta));
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

        const newZoom = Math.min(global_parameters.max_zoom, zoomLevel * 1.2);
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
                        height: 'calc(100vh - 200px)', // Subtract header/footer height
                        minHeight: '500px',
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

                {/* Zoom level indicator */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {Math.round(zoomLevel * 100)}%
                </div>

                {focusedNode &&
                    <SpeciesInfoPanel
                        name={focusedNode.species_info.name}
                        description={focusedNode.species_info.what_is_it}
                        information={focusedNode.species_info.information}
                        image_src={focusedNode.imageSrc}
                        quest_id={focusedNode.quest_id}
                        user_id={focusedNode.user_id}
                        image_filename={focusedNode.image_filename}
                        isOpen={isPanelOpen}
                        onClose={handleClosePanel}
                        isMobile={isMobile}
                    />
                }

            </div>
        </div>
    );
};

export default NetworkTab;