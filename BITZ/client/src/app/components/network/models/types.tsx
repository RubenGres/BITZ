// models/types.ts
export interface SpeciesRow {
    'image_name': string;
    'taxonomic_group': string;
    'scientific_name': string;
    'common_name': string;
    'discovery_timestamp': string;
    'confidence': string;
    'notes': string;
}

export interface NetworkTabProps {
    questDataDict: Record<string, any>;
    questId: string;
    loading: boolean;
    error: string | null;
}

export interface SpeciesInfo {
    name: string;
    what_is_it: string;
    information: string;
    image_filename: string;
    image_location?: string;
}

export interface PanOffset {
    x: number;
    y: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface DragOffset {
    x: number;
    y: number;
}