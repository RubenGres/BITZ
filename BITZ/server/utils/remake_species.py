import os
import oaak_classify
import argparse
from tqdm import tqdm

def process_history(history_folder):
    history_folder = os.path.abspath(history_folder)
    
    if not os.path.exists(history_folder):
        print(f"Error: History folder '{history_folder}' does not exist.")
        return
    
    # Get all subfolders in history_folder
    subfolders = [f.path for f in os.scandir(history_folder) if f.is_dir()]
    
    for folder in tqdm(subfolders, desc="Processing folders", unit="folder"):
        conversation_id = os.path.basename(folder)  # Use the folder name as conversation_id
        csv_path = os.path.join(folder, "species_data_english.csv")
        imgs_folder = os.path.join(folder, "imgs")
        
        print(f"Working on quest {folder}")
        
        if os.path.exists(csv_path):
            print(f"Skipping {folder}, CSV already exists.")
            continue
        
        if not os.path.exists(imgs_folder):
            print(f"Skipping {folder}, no 'imgs' folder found.")
            continue
        
        # Get list of images
        images = [os.path.join(imgs_folder, img) for img in os.listdir(imgs_folder) if img.lower().endswith((".jpg", ".png", ".jpeg"))]
        
        if not images:
            print(f"No images found in {imgs_folder}. Skipping.")
            continue
        
        # Process images with tqdm for progress tracking
        for img_path in tqdm(images, desc=f"Processing images in {folder}", unit="image"):
            oaak_classify.identify_and_populate(img_path, conversation_id, history_folder)
            
        print(f"Finished processing images in {folder}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process species images in history folders.")
    parser.add_argument("history_folder", type=str, help="Path to the history folder")
    args = parser.parse_args()
    
    process_history(args.history_folder)
