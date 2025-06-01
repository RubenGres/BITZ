// utils/networkUtils.ts
import Papa from 'papaparse';
import { Node } from '../models/Node';
import { Connection } from '../models/Connection';
import { SpeciesRow, SpeciesInfo } from '../models/types';
import { API_URL } from '@/app/Constants';

/**
 * Creates network nodes from species data
 */
export const createNodes = (
    speciesData: SpeciesRow[], 
    questId: string, 
    canvasWidth: number, 
    canvasHeight: number
): Node[] => {
    console.log('Creating nodes for quest id:', questId);
    console.log('Species data len:', speciesData.length);
    
    const newNodes: Node[] = [];
    const width = canvasWidth;
    const height = canvasHeight;

    speciesData.forEach((species, index) => {
        const angle = (index / speciesData.length) * Math.PI * 2;
        const radius = Math.min(width, height) * 0.3;
        const x = width / 2 + radius * Math.cos(angle);
        const y = height / 2 + radius * Math.sin(angle);
        
        const imageSrc = species.image_name ? `${API_URL}/explore/images/${questId}/${species.image_name}` : '';
        
        let imageFilename = species.image_name || '';
        
        // If the image filename contains a path, extract just the filename part
        if (imageFilename.includes('/')) {
            imageFilename = imageFilename.split('/').pop() || '';
        }
        
        const node = new Node(
            x,
            y,
            50,
            species['common_name'] || species['scientific_name'] || 'Unknown',
            species['scientific_name'] || '',
            species['taxonomic_group'] || '',
            imageSrc,
            imageFilename,
            questId
        );
        
        newNodes.push(node);
    });

    return newNodes;
};

/**
 * Creates connections between nodes based on taxonomic groups
 */
export const createConnections = (nodes: Node[]): Connection[] => {
    const connections: Connection[] = [];

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (nodes[i].taxonomicGroup === nodes[j].taxonomicGroup && nodes[i].taxonomicGroup) {
                const connection = new Connection(nodes[i], nodes[j], nodes[i].taxonomicGroup);
                connections.push(connection);
                nodes[i].connections.push(connection);
                nodes[j].connections.push(connection);
            }
        }
    }

    return connections;
};

/**
 * Apply physical forces to the network nodes
 */
export const applyForces = (nodes: Node[], connections: Connection[], selectedNode: Node | null, isDragging: boolean): void => {
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

/**
 * Finds species information from quest data
 */
export const findSpeciesInfo = (
    image_filename: string, 
    quest_id: string,
    questDataDict: Record<string, any>
): SpeciesInfo | null => {
    const questData = questDataDict[quest_id];
    
    if (!questData?.history || !image_filename) {
        console.warn('No history data or image filename');
        return null;
    }
    
    // Debug: Log all image filenames in history
    const historyFiles = questData.history.map(item => item.image_filename);

    const historyItem = questData.history.find(item => 
        item.image_filename === image_filename
    );
    
    if (!historyItem || !historyItem.assistant) {
        console.warn('No matching history item or assistant data');
        return null;
    }
    
    try {
        // Fix the JSON format by replacing single quotes with double quotes
        // This is necessary because the data appears to be using JavaScript object literal syntax
        // rather than strict JSON format
        let fixedJsonStr = historyItem.assistant
            .replace(/'/g, '"')
            .replace(/\\"/g, '\\"');
        
        // Parse the fixed JSON string
        const assistantData = JSON.parse(fixedJsonStr);

        if (assistantData.species_identification) {
            return {
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
        console.error("Error parsing assistant data:", e);
        console.error("Error details:", e.message);
        console.log("Full assistant data:", historyItem.assistant);
    }
    
    return null;
};

/**
 * Process CSV data from quest data
 */
export const processQuestData = (
    questDataDict: Record<string, any>,
    canvasWidth: number,
    canvasHeight: number,
    callback: (nodes: Node[], connections: Connection[]) => void
): void => {
    let allNodes: Node[] = [];
    
    // Count quests with data to process
    const questsToProcess = Object.entries(questDataDict).filter(
        ([_, questData]) => questData?.species_data_csv
    ).length;
    
    let processedQuests = 0;
    
    Object.entries(questDataDict).forEach(([questId, questData]) => {
        if (questData?.species_data_csv) {
            Papa.parse(questData.species_data_csv, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const speciesData = results.data as SpeciesRow[];
                    const newNodes = createNodes(speciesData, questId, canvasWidth, canvasHeight);
                    if (newNodes) {
                        allNodes = [...allNodes, ...newNodes];
                    }
                    
                    processedQuests++;
                    
                    // When all quests are processed, create connections and start animation
                    if (processedQuests === questsToProcess) {
                        const connections = createConnections(allNodes);
                        callback(allNodes, connections);
                    }
                }
            });
        }
    });
    
    // If no quests with data, still call callback with empty arrays
    if (questsToProcess === 0) {
        callback([], []);
    }
};