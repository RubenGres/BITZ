#!/usr/bin/env python3
"""
Script to backup the 'history' folder to a GCP bucket.
Usage: ./backup.py [bucket_name] [backup_prefix]
"""

import os
import sys
import time
import zipfile
import datetime
from google.cloud import storage

def create_zip_archive(source_dir, output_filename):
    """
    Create a zip archive of the specified directory
    
    Args:
        source_dir (str): Directory to zip
        output_filename (str): Output zip file path
    
    Returns:
        str: Path to the created zip file
    """
    print(f"Creating zip archive of {source_dir}...")
    
    if not os.path.exists(source_dir):
        print(f"Error: Source directory '{source_dir}' does not exist")
        sys.exit(1)
        
    try:
        with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(source_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, os.path.dirname(source_dir))
                    print(f"Adding {arcname}")
                    zipf.write(file_path, arcname)
        
        print(f"Zip archive created: {output_filename}")
        return output_filename
    except Exception as e:
        print(f"Error creating zip archive: {e}")
        sys.exit(1)

def upload_to_gcp(bucket_name, source_file, destination_blob_name):
    """
    Upload a file to a GCP bucket
    
    Args:
        bucket_name (str): Name of the GCP bucket
        source_file (str): Local file to upload
        destination_blob_name (str): Destination blob name in the bucket
    
    Returns:
        str: Public URL of the uploaded file
    """
    print(f"Uploading {source_file} to GCP bucket {bucket_name}...")
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(destination_blob_name)
        
        # Upload the file
        blob.upload_from_filename(source_file)
        
        print(f"File {source_file} uploaded to {destination_blob_name}")
        return blob.public_url
    except Exception as e:
        print(f"Error uploading to GCP: {e}")
        sys.exit(1)

def main():
    # Check for command-line arguments
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} [bucket_name] [backup_prefix]")
        print("If backup_prefix is not provided, 'history_backup' will be used")
        sys.exit(1)
    
    # Get parameters
    bucket_name = sys.argv[1]
    backup_prefix = sys.argv[2] if len(sys.argv) > 2 else "history_backup"
    
    # Set paths
    history_dir = "history"
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"{backup_prefix}_{timestamp}.zip"
    
    # Create the zip archive
    zip_path = create_zip_archive(history_dir, zip_filename)
    
    # Upload to GCP
    destination_blob = f"backups/{zip_filename}"
    public_url = upload_to_gcp(bucket_name, zip_path, destination_blob)
    
    # Save the last backup info to a local file for restore purposes
    with open(".last_backup.txt", "w") as f:
        f.write(f"{bucket_name}|{destination_blob}|{timestamp}")
    
    print("\nBackup Summary:")
    print(f"- Source: {history_dir}")
    print(f"- Backup file: {zip_filename}")
    print(f"- GCP bucket: {bucket_name}")
    print(f"- GCP path: {destination_blob}")
    print(f"- Timestamp: {timestamp}")
    print("\nBackup completed successfully!")
    print(f"Backup info saved to .last_backup.txt for restore purposes")
    
    # Cleanup the local zip file
    try:
        os.remove(zip_path)
        print(f"Temporary zip file {zip_path} removed")
    except Exception as e:
        print(f"Warning: Could not remove temporary zip file: {e}")

if __name__ == "__main__":
    main()