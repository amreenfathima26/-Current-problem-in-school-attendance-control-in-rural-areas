"""
Face Recognition utilities for automated attendance system.
Handles face detection, recognition, encoding, and model training.
"""
import os
import numpy as np
import cv2
from PIL import Image
from typing import List, Dict, Tuple, Optional, Any
import logging
import pickle
from datetime import datetime
from pathlib import Path
import json
from django.apps import apps
from django.core.exceptions import ObjectDoesNotExist

# Try to import face_recognition, but make it optional
try:
    import face_recognition
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    logging.warning("face_recognition module not available. Face recognition features will be disabled. Install dlib and face_recognition to enable.")

logger = logging.getLogger(__name__)


class FaceRecognitionEngine:
    """Face Recognition Engine for student attendance."""
    
    def __init__(self, model_dir: str = None):
        """
        Initialize Face Recognition Engine.
        
        Args:
            model_dir: Directory to store/load model files
        """
        if model_dir:
            self.model_dir = os.path.abspath(model_dir)
        else:
            # Use absolute path to ensure it works from any directory
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.model_dir = os.path.join(base_dir, 'models')
        
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.model_path = os.path.join(self.model_dir, 'face_recognition_model.pkl')
        logger.info(f"Face Recognition Engine initialized. Model path: {self.model_path}")
        self.known_face_encodings = []
        self.known_face_student_ids = []
        self.is_loaded = False
        
    def load_model(self) -> bool:
        """
        Load trained face recognition model from disk.
        
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            if os.path.exists(self.model_path):
                with open(self.model_path, 'rb') as f:
                    model_data = pickle.load(f)
                    self.known_face_encodings = model_data.get('encodings', [])
                    self.known_face_student_ids = model_data.get('student_ids', [])
                    self.is_loaded = True
                    logger.info(f"Loaded face recognition model with {len(self.known_face_encodings)} face encodings")
                    return True
            else:
                logger.warning(f"Model file not found at {self.model_path}")
                self.is_loaded = False
                return False
        except Exception as e:
            logger.error(f"Error loading face recognition model: {e}")
            self.is_loaded = False
            return False
    
    def save_model(self, encodings: List, student_ids: List) -> bool:
        """
        Save trained face recognition model to disk.
        
        Args:
            encodings: List of face encodings
            student_ids: List of corresponding student IDs
            
        Returns:
            bool: True if model saved successfully
        """
        try:
            model_data = {
                'encodings': encodings,
                'student_ids': student_ids,
                'trained_at': datetime.now().isoformat(),
                'count': len(encodings)
            }
            with open(self.model_path, 'wb') as f:
                pickle.dump(model_data, f)
            self.known_face_encodings = encodings
            self.known_face_student_ids = student_ids
            self.is_loaded = True
            logger.info(f"Saved face recognition model with {len(encodings)} face encodings")
            return True
        except Exception as e:
            logger.error(f"Error saving face recognition model: {e}")
            return False
    
    def detect_faces(self, image_path: str) -> List[Tuple[int, int, int, int]]:
        """
        Detect faces in an image.
        
        Args:
            image_path: Path to image file
            
        Returns:
            List of (top, right, bottom, left) tuples for each face found
        """
        if not FACE_RECOGNITION_AVAILABLE:
            logger.error("face_recognition module not available. Please install dlib and face_recognition.")
            return []
        try:
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            logger.debug(f"Detected {len(face_locations)} face(s) in {image_path}")
            return face_locations
        except Exception as e:
            logger.error(f"Error detecting faces in {image_path}: {e}")
            return []
    
    def _preprocess_image(self, image_path: str) -> Optional[np.ndarray]:
        """
        Preprocess image for better face recognition accuracy.
        - Resize if too large
        - Enhance contrast
        - Convert to RGB
        
        Args:
            image_path: Path to image file
            
        Returns:
            Preprocessed image array or None
        """
        try:
            # Load image using OpenCV for better control
            img = cv2.imread(image_path)
            if img is None:
                # Try loading with PIL if OpenCV fails
                img = np.array(Image.open(image_path))
                img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
            
            # Convert BGR to RGB (face_recognition uses RGB)
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Resize if image is too large (improves speed and accuracy)
            height, width = rgb_img.shape[:2]
            max_dimension = 800
            if width > max_dimension or height > max_dimension:
                if width > height:
                    new_width = max_dimension
                    new_height = int((height * max_dimension) / width)
                else:
                    new_height = max_dimension
                    new_width = int((width * max_dimension) / height)
                rgb_img = cv2.resize(rgb_img, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            # Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
            # This improves face recognition accuracy in varying lighting conditions
            lab = cv2.cvtColor(rgb_img, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            enhanced = cv2.merge([l, a, b])
            rgb_img = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
            
            return rgb_img
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {e}")
            # Fallback to simple loading
            try:
                if FACE_RECOGNITION_AVAILABLE:
                    return face_recognition.load_image_file(image_path)
                return None
            except:
                return None
    
    def encode_face(self, image_path: str, face_location: Tuple[int, int, int, int] = None, use_hog_for_training: bool = False) -> Optional[np.ndarray]:
        """
        Generate face encoding for a face in an image.
        Uses multiple models for better accuracy (HOG + CNN).
        
        Args:
            image_path: Path to image file
            face_location: Optional face location tuple (top, right, bottom, left)
            
        Returns:
            Face encoding array or None if face not found
        """
        if not FACE_RECOGNITION_AVAILABLE:
            logger.warning("face_recognition module not available. Skipping encoding.")
            return None

        try:
            # Preprocess image for better accuracy
            image = self._preprocess_image(image_path)
            if image is None:
                logger.warning(f"Failed to load image: {image_path}")
                return None
            
            # Use CNN model for better accuracy (slower but more accurate)
            # For training, we want highest accuracy
            if face_location:
                face_encodings = face_recognition.face_encodings(
                    image, 
                    [face_location],
                    model='large'  # Use large model for better accuracy
                )
            else:
                # Use HOG for faster training, CNN for better accuracy during recognition
                if use_hog_for_training:
                    # Fast training mode - use HOG
                    face_locations = face_recognition.face_locations(image, model='hog')
                else:
                    # Recognition mode - try CNN first for better accuracy
                    face_locations = face_recognition.face_locations(image, model='cnn')
                    if len(face_locations) == 0:
                        # Fallback to HOG if CNN fails
                        face_locations = face_recognition.face_locations(image, model='hog')
                
                if len(face_locations) > 0:
                    # Use the first (largest) face
                    face_encodings = face_recognition.face_encodings(
                        image, 
                        [face_locations[0]],
                        model='large'  # Use large model for better accuracy
                    )
                else:
                    face_encodings = []
            
            if len(face_encodings) > 0:
                return face_encodings[0]
            else:
                logger.warning(f"No face encoding found in {image_path}")
                return None
        except Exception as e:
            logger.error(f"Error encoding face in {image_path}: {e}")
            return None
    
    def recognize_face(self, image_path: str, tolerance: float = 0.45) -> Optional[Dict[str, Any]]:
        """
        Recognize a face in an image against known faces.
        
        Args:
            image_path: Path to image file
            tolerance: Distance tolerance for face matching (lower = stricter)
            
        Returns:
            Dict with 'student_id', 'distance', 'confidence' or None if no match
        """
        if not self.is_loaded:
            if not self.load_model():
                logger.error("Cannot recognize face: model not loaded")
                return None
        
        if len(self.known_face_encodings) == 0:
            logger.warning("No known faces in model")
            return None
        
        if not FACE_RECOGNITION_AVAILABLE:
            logger.error("face_recognition module not available. Please install dlib and face_recognition.")
            return None
        try:
            # Preprocess and encode the unknown face
            unknown_image = self._preprocess_image(image_path)
            if unknown_image is None:
                logger.warning(f"Failed to load image: {image_path}")
                return None
            
            # Use HOG for speed (CNN is too slow for real-time CPU)
            face_locations = face_recognition.face_locations(unknown_image, model='hog')
            
            if len(face_locations) == 0:
                logger.warning(f"No face found in {image_path}")
                return None
            
            # Use the first (largest) face
            unknown_encodings = face_recognition.face_encodings(
                unknown_image,
                [face_locations[0]]
            )
            
            if len(unknown_encodings) == 0:
                logger.warning(f"Failed to encode face in {image_path}")
                return None
            
            unknown_encoding = unknown_encodings[0]
            
            # Compare with known faces
            face_distances = face_recognition.face_distance(
                self.known_face_encodings, 
                unknown_encoding
            )
            
            # Find the best match
            best_match_index = np.argmin(face_distances)
            best_distance = face_distances[best_match_index]
            
            # Calculate confidence (1 - normalized distance, clamped to 0-1)
            confidence = max(0.0, 1.0 - (best_distance / tolerance))
            
            # Check if distance is within tolerance
            if best_distance <= tolerance:
                student_id = self.known_face_student_ids[best_match_index]
                logger.info(f"Face recognized: {student_id} (confidence: {confidence:.2f}, distance: {best_distance:.4f})")
                return {
                    'student_id': student_id,
                    'distance': float(best_distance),
                    'confidence': float(confidence),
                    'matched': True
                }
            else:
                logger.info(f"No match found (best distance: {best_distance:.4f} > tolerance: {tolerance})")
                return {
                    'student_id': None,
                    'distance': float(best_distance),
                    'confidence': float(confidence),
                    'matched': False
                }
        except Exception as e:
            logger.error(f"Error recognizing face in {image_path}: {e}")
            return None
    
    def recognize_face_from_bytes(self, image_bytes: bytes, tolerance: float = 0.45) -> Optional[Dict[str, Any]]:
        """
        Recognize a face from image bytes (for API use).
        
        Args:
            image_bytes: Image data as bytes
            tolerance: Distance tolerance for face matching
            
        Returns:
            Dict with recognition results or None
        """
        if not self.is_loaded:
            if not self.load_model():
                logger.error("Cannot recognize face: model not loaded")
                return None
        
        if len(self.known_face_encodings) == 0:
            logger.warning("No known faces in model")
            return None
        
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                logger.error("Failed to decode image from bytes")
                return None
            
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Enhance contrast for better recognition (same as preprocessing)
            lab = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            enhanced = cv2.merge([l, a, b])
            rgb_image = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
            
            # Resize if too large (Optimize to 600px for speed)
            height, width = rgb_image.shape[:2]
            max_dimension = 600
            if width > max_dimension or height > max_dimension:
                if width > height:
                    new_width = max_dimension
                    new_height = int((height * max_dimension) / width)
                else:
                    new_height = max_dimension
                    new_width = int((width * max_dimension) / height)
                rgb_image = cv2.resize(rgb_image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            
            # Use HOG for speed in real-time recognition
            face_locations = face_recognition.face_locations(rgb_image, model='hog')
            
            if len(face_locations) == 0:
                logger.warning("No face found in image bytes")
                return None
            
            # Encode the face
            face_encodings = face_recognition.face_encodings(
                rgb_image,
                [face_locations[0]]
            )
            
            if len(face_encodings) == 0:
                logger.warning("Failed to encode face from image bytes")
                return None
            
            unknown_encoding = face_encodings[0]
            
            # Compare with known faces
            face_distances = face_recognition.face_distance(
                self.known_face_encodings,
                unknown_encoding
            )
            
            # Find the best match
            best_match_index = np.argmin(face_distances)
            best_distance = face_distances[best_match_index]
            confidence = max(0.0, 1.0 - (best_distance / tolerance))
            
            if best_distance <= tolerance:
                student_id = self.known_face_student_ids[best_match_index]
                logger.info(f"Face recognized from bytes: {student_id} (confidence: {confidence:.2f})")
                return {
                    'student_id': student_id,
                    'distance': float(best_distance),
                    'confidence': float(confidence),
                    'matched': True
                }
            else:
                logger.info(f"No match found from bytes (best distance: {best_distance:.4f} > tolerance: {tolerance})")
                return {
                    'student_id': None,
                    'distance': float(best_distance),
                    'confidence': float(confidence),
                    'matched': False
                }
        except Exception as e:
            logger.error(f"Error recognizing face from bytes: {e}")
            return None
    
    def train_model(self, face_images: List[Dict[str, str]], progress_callback=None) -> Dict[str, Any]:
        """
        Train the face recognition model from a list of face images.
        
        Args:
            face_images: List of dicts with 'image_path' and 'student_id'
            progress_callback: Optional callable(percent, message) for progress updates
            
        Returns:
            Dict with training results (accuracy, count, errors, etc.)
        """
        try:
            encodings = []
            student_ids = []
            errors = []
            processed_count = 0
            
            logger.info(f"🚀 Starting model training with {len(face_images)} images...")
            print(f"🚀 [TRAINING] Starting model training with {len(face_images)} images...")
            if progress_callback:
                progress_callback(0, f"Starting training with {len(face_images)} images...")
            
            for idx, face_data in enumerate(face_images):
                image_path = face_data.get('image_path')
                student_id = face_data.get('student_id')
                
                if not image_path or not student_id:
                    errors.append(f"Image {idx}: Missing image_path or student_id")
                    continue
                
                if not os.path.exists(image_path):
                    errors.append(f"Image {idx}: File not found - {image_path}")
                    continue
                
                # Progress logging
                progress = ((idx + 1) / len(face_images)) * 100
                if (idx + 1) % 5 == 0 or idx == 0 or idx == len(face_images) - 1:
                    logger.info(f"📊 [TRAINING] Progress: {idx + 1}/{len(face_images)} ({progress:.1f}%) - Processing {student_id}")
                    print(f"📊 [TRAINING] Progress: {idx + 1}/{len(face_images)} ({progress:.1f}%) - Processing {student_id}")
                
                if progress_callback:
                    progress_callback(progress, f"Training: Processing {student_id} ({idx+1}/{len(face_images)})")
                
                # Try to get cached encoding
                encoding = None
                face_image_id = face_data.get('face_image_id')
                StudentFaceImage = None
                
                if face_image_id:
                    try:
                        StudentFaceImage = apps.get_model('attendance', 'StudentFaceImage')
                        face_img_obj = StudentFaceImage.objects.filter(id=face_image_id).first()
                        if face_img_obj and face_img_obj.encoding:
                            encoding = np.array(json.loads(face_img_obj.encoding))
                            # logger.debug(f"Using cached encoding for image {face_image_id}")
                    except Exception as e:
                        logger.warning(f"Error fetching cached encoding: {e}")

                if encoding is None:
                    # Encode the face (use HOG for faster training, CNN is slower)
                    encoding = self.encode_face(image_path, use_hog_for_training=True)
                    
                    # Cache the encoding if successful
                    if encoding is not None and face_image_id and StudentFaceImage:
                        try:
                            if face_img_obj:
                                face_img_obj.encoding = json.dumps(encoding.tolist())
                                face_img_obj.encoding_cached = True
                                face_img_obj.save(update_fields=['encoding', 'encoding_cached'])
                        except Exception as e:
                            logger.error(f"Failed to cache encoding for {face_image_id}: {e}")

                if encoding is not None:
                    encodings.append(encoding)
                    student_ids.append(student_id)
                    processed_count += 1
                else:
                    errors.append(f"Image {idx}: Could not encode face - {image_path}")
            
            if len(encodings) == 0:
                logger.error("No valid face encodings generated during training")
                return {
                    'success': False,
                    'error': 'No valid face encodings generated',
                    'processed': 0,
                    'errors': errors
                }
            
            # Save the model
            if self.save_model(encodings, student_ids):
                logger.info(f"✅ [TRAINING] Model training completed: {processed_count} faces encoded, {len(set(student_ids))} unique students")
                print(f"✅ [TRAINING] Model training completed: {processed_count} faces encoded, {len(set(student_ids))} unique students")
                return {
                    'success': True,
                    'processed': processed_count,
                    'total_encodings': len(encodings),
                    'unique_students': len(set(student_ids)),
                    'errors': errors,
                    'model_path': self.model_path
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to save model',
                    'processed': processed_count,
                    'errors': errors
                }
        except Exception as e:
            logger.error(f"Error training model: {e}")
            return {
                'success': False,
                'error': str(e),
                'processed': 0,
                'errors': []
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model.
        
        Returns:
            Dict with model information
        """
        # Try to load if not already loaded
        if not self.is_loaded:
            self.load_model()
        
        if not self.is_loaded:
            return {
                'loaded': False,
                'encoding_count': 0,
                'model_path': self.model_path,
                'model_exists': os.path.exists(self.model_path)
            }
        
        return {
            'loaded': True,
            'encoding_count': len(self.known_face_encodings),
            'unique_students': len(set(self.known_face_student_ids)),
            'model_path': self.model_path,
            'model_exists': True
        }
    
    def reload_model(self) -> bool:
        """
        Reload the model from disk.
        Useful after training to load the new model.
        
        Returns:
            bool: True if reloaded successfully
        """
        return self.load_model()


# Global instance
_face_engine = None

def get_face_engine(reload: bool = False) -> FaceRecognitionEngine:
    """
    Get or create the global face recognition engine instance.
    
    Args:
        reload: If True, reload the model even if already loaded
    
    Returns:
        FaceRecognitionEngine instance
    """
    global _face_engine
    if _face_engine is None or reload:
        _face_engine = FaceRecognitionEngine()
        _face_engine.load_model()
    return _face_engine

