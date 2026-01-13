"""
Dataset handler for processing ZIP file uploads and extracting face images.
"""
import os
import zipfile
import shutil
import logging
from typing import List, Dict, Tuple
from pathlib import Path
from PIL import Image

# Try to import face_recognition, but make it optional
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logging.warning("face_recognition module not available. Face recognition features will be disabled.")

logger = logging.getLogger(__name__)


class DatasetHandler:
    """Handle dataset ZIP file uploads and extraction."""
    
    def __init__(self, upload_dir: str = None, extract_dir: str = None):
        """
        Initialize Dataset Handler.
        
        Args:
            upload_dir: Directory to store uploaded ZIP files
            extract_dir: Directory to extract datasets
        """
        base_dir = os.path.dirname(os.path.dirname(__file__))
        self.upload_dir = upload_dir or os.path.join(base_dir, 'media', 'dataset_uploads')
        self.extract_dir = extract_dir or os.path.join(base_dir, 'media', 'datasets')
        
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.extract_dir, exist_ok=True)
    
    def extract_zip(self, zip_path: str, extract_to: str = None) -> Tuple[bool, str, List[str], str]:
        """
        Extract ZIP file and return list of image files.
        Handles nested folder structures automatically.
        
        Args:
            zip_path: Path to ZIP file
            extract_to: Directory to extract to (optional)
            
        Returns:
            Tuple of (success, message, list of extracted image paths)
        """
        try:
            extract_to = extract_to or self.extract_dir
            
            # Create unique extraction directory
            zip_name = Path(zip_path).stem
            extract_path = os.path.join(extract_to, zip_name)
            
            # Remove existing extraction if exists
            if os.path.exists(extract_path):
                shutil.rmtree(extract_path)
            
            os.makedirs(extract_path, exist_ok=True)
            
            # Extract ZIP
            logger.info(f"Extracting ZIP file: {zip_path}")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(extract_path)
            
            logger.info(f"ZIP extracted to: {extract_path}")
            
            # Find all image files (handles nested folders automatically)
            image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'}
            image_files = []
            
            for root, dirs, files in os.walk(extract_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    if Path(file).suffix.lower() in image_extensions:
                        image_files.append(file_path)
                        logger.debug(f"Found image: {file_path}")
            
            logger.info(f"Extracted {len(image_files)} images from {zip_path} (including nested folders)")
            if len(image_files) == 0:
                logger.warning(f"No images found in ZIP file. Check folder structure.")
            return True, f"Extracted {len(image_files)} images", image_files, extract_path
            
        except zipfile.BadZipFile:
            error_msg = "Invalid ZIP file format"
            logger.error(error_msg)
            return False, error_msg, [], None
        except Exception as e:
            error_msg = f"Error extracting ZIP: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return False, error_msg, [], None
    
    def validate_image(self, image_path: str) -> Tuple[bool, str]:
        """
        Validate that an image file contains a face.
        Uses CNN model for better face detection accuracy.
        
        Args:
            image_path: Path to image file
            
        Returns:
            Tuple of (is_valid, message)
        """
        try:
            # Check if file exists
            if not os.path.exists(image_path):
                return False, "File not found"
            
            # Try to load image
            try:
                image = face_recognition.load_image_file(image_path)
            except Exception as e:
                return False, f"Cannot load image: {str(e)}"
            
            if not FACE_RECOGNITION_AVAILABLE:
                return False, "face_recognition module not available"
            
            # Check for faces using CNN model for better accuracy
            # Try CNN first, fallback to HOG if needed
            face_locations = face_recognition.face_locations(image, model='cnn')
            if len(face_locations) == 0:
                # Fallback to HOG model
                face_locations = face_recognition.face_locations(image, model='hog')
            
            if len(face_locations) == 0:
                return False, "No face detected in image"
            elif len(face_locations) > 1:
                return False, "Multiple faces detected (expected single face)"
            
            # Additional validation: Try to encode the face to ensure it's usable
            face_encodings = face_recognition.face_encodings(image, face_locations, model='large')
            if len(face_encodings) == 0:
                return False, "Face detected but cannot be encoded"
            
            return True, "Valid image with single face"
            
        except Exception as e:
            return False, f"Error validating image: {str(e)}"
    
    def parse_student_id_from_path(self, file_path: str, extract_base_path: str = None) -> str:
        """
        Extract student ID from file path (both folder name and filename).
        Handles formats like:
        - folder_name/image.jpg (student ID from folder)
        - student_id.jpg (student ID from filename)
        - STU001/photo.jpg (student ID from folder)
        - folder/STU001_1.jpg (student ID from filename)
        
        Args:
            file_path: Full path to the image file
            extract_base_path: Base path of extraction (to get relative folder structure)
            
        Returns:
            Extracted student ID or None
        """
        try:
            file_path_obj = Path(file_path)
            filename = file_path_obj.name
            folder_path = file_path_obj.parent
            
            # If extract_base_path provided, get relative folder structure
            if extract_base_path:
                try:
                    relative_path = os.path.relpath(folder_path, extract_base_path)
                    folder_parts = Path(relative_path).parts
                    
                    # Check each folder level for student ID pattern
                    for folder_name in folder_parts:
                        if folder_name and folder_name != '.' and len(folder_name) >= 3:
                            # Clean folder name (remove spaces, special chars)
                            clean_folder = folder_name.strip().upper().replace(' ', '_')
                            # Check if it looks like a student ID (alphanumeric, reasonable length)
                            if clean_folder.replace('_', '').replace('-', '').isalnum() and 3 <= len(clean_folder) <= 20:
                                logger.debug(f"Found student ID from folder: {clean_folder} (from path: {file_path})")
                                return clean_folder
                except Exception as e:
                    logger.debug(f"Could not get relative path: {e}")
            
            # Fallback: Try to extract from folder name directly
            folder_name = folder_path.name
            if folder_name and len(folder_name) >= 3:
                clean_folder = folder_name.strip().upper().replace(' ', '_')
                if clean_folder.replace('_', '').replace('-', '').isalnum() and 3 <= len(clean_folder) <= 20:
                    logger.debug(f"Found student ID from folder name: {clean_folder}")
                    return clean_folder
            
            # Last resort: Extract from filename
            name = file_path_obj.stem
            
            # Remove common suffixes like _1, _2, _backup, etc.
            if '_' in name:
                parts = name.split('_')
                # If first part looks like a student ID, use it
                if len(parts[0]) >= 3:
                    student_id = parts[0].upper()
                    logger.debug(f"Found student ID from filename prefix: {student_id}")
                    return student_id
                elif len(parts) >= 2 and len('_'.join(parts[:2])) >= 3:
                    # Might be format like STU_001_1, take first two parts
                    student_id = '_'.join(parts[:2]).upper()
                    logger.debug(f"Found student ID from filename (2 parts): {student_id}")
                    return student_id
            else:
                # No underscore, use whole name
                if len(name) >= 3:
                    student_id = name.upper()
                    logger.debug(f"Found student ID from filename: {student_id}")
                    return student_id
            
            logger.warning(f"Could not extract student ID from path: {file_path}")
            return None
            
        except Exception as e:
            logger.warning(f"Error parsing student ID from {file_path}: {e}")
            return None
    
    def parse_student_id_from_filename(self, filename: str) -> str:
        """
        Extract student ID from filename (backward compatibility).
        Uses parse_student_id_from_path internally.
        
        Args:
            filename: Name of the file
            
        Returns:
            Extracted student ID or None
        """
        return self.parse_student_id_from_path(filename)
    
    def organize_images_by_student(self, image_paths: List[str], extract_base_path: str = None) -> Dict[str, List[str]]:
        """
        Organize images by student ID (extracted from folder path or filename).
        
        Args:
            image_paths: List of image file paths
            extract_base_path: Base path of extraction (for relative folder structure)
            
        Returns:
            Dict mapping student_id to list of image paths
        """
        student_images = {}
        unmapped_images = []
        
        for image_path in image_paths:
            # Use improved parsing that checks both folder and filename
            student_id = self.parse_student_id_from_path(image_path, extract_base_path)
            
            if student_id:
                # Clean and normalize student ID
                student_id = student_id.strip().upper()
                if student_id not in student_images:
                    student_images[student_id] = []
                student_images[student_id].append(image_path)
            else:
                unmapped_images.append(image_path)
                logger.warning(f"Could not extract student ID from: {image_path}")
        
        logger.info(f"Organized {len(image_paths)} images into {len(student_images)} students")
        if unmapped_images:
            logger.warning(f"Could not map {len(unmapped_images)} images to students")
        
        return student_images
    
    def process_dataset(self, zip_path: str) -> Dict[str, any]:
        """
        Process a dataset ZIP file: extract, validate, and organize images.
        
        Args:
            zip_path: Path to uploaded ZIP file
            
        Returns:
            Dict with processing results
        """
        try:
            # Extract ZIP
            success, message, image_files, extract_path = self.extract_zip(zip_path)
            if not success:
                return {
                    'success': False,
                    'error': message,
                    'valid_images': [],
                    'invalid_images': [],
                    'student_images': {},
                    'extract_path': None
                }
            
            # Validate and organize images
            valid_images = []
            invalid_images = []
            
            for image_path in image_files:
                is_valid, msg = self.validate_image(image_path)
                if is_valid:
                    valid_images.append(image_path)
                else:
                    invalid_images.append({
                        'path': os.path.basename(image_path),
                        'error': msg
                    })
            
            # Organize by student ID (pass extract_path for folder structure awareness)
            student_images = self.organize_images_by_student(valid_images, extract_base_path=extract_path)
            
            return {
                'success': True,
                'message': f"Processed {len(valid_images)} valid images for {len(student_images)} students",
                'total_images': len(image_files),
                'valid_images': valid_images,
                'invalid_images': invalid_images,
                'student_images': student_images,
                'extract_path': extract_path
            }
            
        except Exception as e:
            logger.error(f"Error processing dataset: {e}")
            return {
                'success': False,
                'error': str(e),
                'valid_images': [],
                'invalid_images': [],
                'student_images': {}
            }

