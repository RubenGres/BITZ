export interface QuestMetadata {
  quest_id?: string;
  flavor?: string;
  location?: any;
  date_time?: string;
  duration?: string | number;
  nb_images?: number;
  species_count?: number;
  taxonomic_groups?: Record<string, number>;
}

export interface QuestData {
    metadata?: QuestMetadata;
    species_data_csv?: string;
}