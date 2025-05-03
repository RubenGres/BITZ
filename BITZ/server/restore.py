#!/usr/bin/env python3
"""
Script to restore a backup from a GCP bucket.
Usage: ./restore.py [specific_backup_path] 
       or just ./restore.py to restore the last backup
"""

import os
import sys
import zipfile
import shutil
from google.cloud import storage

def download_from_gcp(bucket_name, source_blob_name, destination_file):
    """
    Download a file from a GCP bucket
    
    Args:
        bucket_name (str): Name of the GCP bucket
        source_blob_name (str): Source blob name in the bucket
        destination_file (str): Local destination file path
    """
    print(f"Downloading {source_blob_name} from GCP bucket {bucket_name}...")
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(source_blob_name)
        
        # Download the file
        blob.download_to_filename(destination_file)
        
        print(f"File {source_blob_name} downloaded to {destination_file}")
    except Exception as e:
        print(f"Error downloading from GCP: {e}")
        sys.exit(1)

def extract_zip_archive(zip_file, destination_dir):
    """
    Extract a zip archive to the specified directory
    
    Args:
        zip_file (str): Path to the zip file
        destination_dir (str): Directory to extract to
    """
    print(f"Extracting {zip_file} to {destination_dir}...")
    
    try:
        # Create temp directory for extraction
        temp_dir = f"{destination_dir}_temp"
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        os.makedirs(temp_dir)
        
        # Extract the zip file
        with zipfile.ZipFile(zip_file, 'r') as zipf:
            zipf.extractall(temp_dir)
        
        # If destination directory exists, rename it to _old as backup
        if os.path.exists(destination_dir):
            backup_dir = f"{destination_dir}_old"
            if os.path.exists(backup_dir):
                shutil.rmtree(backup_dir)
            shutil.move(destination_dir, backup_dir)
            print(f"Existing {destination_dir} backed up to {backup_dir}")
        
        # Move the extracted contents to the destination directory
        shutil.move(temp_dir, destination_dir)
        
        print(f"Extraction completed to {destination_dir}")
    except Exception as e:
        print(f"Error extracting zip archive: {e}")
        sys.exit(1)

def get_last_backup_info():
    """
    Get information about the last backup from .last_backup.txt
    
    Returns:
        tuple: (bucket_name, blob_path)
    """
    try:
        with open(".last_backup.txt", "r") as f:
            info = f.read().strip().split("|")
            return info[0], info[1]
    except Exception as e:
        print(f"Error reading last backup info: {e}")
        print("Please specify the backup to restore manually.")
        sys.exit(1)

def main():
    # Determine which backup to restore
    if len(sys.argv) > 2:
        # If both bucket and blob path are provided
        bucket_name = sys.argv[1]
        source_blob_name = sys.argv[2]
    elif len(sys.argv) == 2 and '/' in sys.argv[1]:
        # If a combined path is provided (e.g., "bucket/path/to/backup.zip")
        parts = sys.argv[1].split('/', 1)
        bucket_name = parts[0]
        source_blob_name = parts[1]
    else:
        # Use the last backup
        print("No specific backup specified, attempting to restore the last backup...")
        bucket_name, source_blob_name = get_last_backup_info()
    
    # Set paths
    destination_dir = "history"
    local_zip = os.path.basename(source_blob_name)
    
    # Download the backup from GCP
    download_from_gcp(bucket_name, source_blob_name, local_zip)
    
    # Extract the backup
    extract_zip_archive(local_zip, destination_dir)
    
    print("\nRestore Summary:")
    print(f"- GCP bucket: {bucket_name}")
    print(f"- GCP path: {source_blob_name}")
    print(f"- Destination: {destination_dir}")
    
    # Cleanup the local zip file
    try:
        os.remove(local_zip)
        print(f"Temporary zip file {local_zip} removed")
    except Exception as e:
        print(f"Warning: Could not remove temporary zip file: {e}")
    
    print("\nRestore completed successfully!")

if __name__ == "__main__":
    main()