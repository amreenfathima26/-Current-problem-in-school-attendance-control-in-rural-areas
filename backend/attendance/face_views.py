"""
Face Recognition API views for attendance system.
"""
import os
import logging
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import Student
from attendance.models import AttendanceRecord, FaceRecognitionModel, StudentFaceImage
from .serializers import AttendanceRecordSerializer
from utils.face_recognition_utils import get_face_engine, FACE_RECOGNITION_AVAILABLE
from utils.dataset_handler import DatasetHandler

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_dataset(request):
    """
    Upload and process a ZIP file containing student face images.
    Expected format: ZIP file with images named like student_id.jpg, STU001.jpg, etc.
    """
    try:
        task_id = request.data.get('task_id')
        
        def update_progress(percent, msg):
            if task_id:
                cache.set(f'dataset_progress_{task_id}', {
                    'percent': percent, 
                    'status': 'processing', 
                    'message': msg
                }, timeout=300)

        if 'dataset' not in request.FILES:
            return Response(
                {'error': 'No dataset file provided. Please upload a ZIP file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        update_progress(5, "Validating file...")
        zip_file = request.FILES['dataset']
        
        # Validate file type
        if not zip_file.name.endswith('.zip'):
            return Response(
                {'error': 'Invalid file type. Please upload a ZIP file.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save uploaded file temporarily
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'dataset_uploads')
        os.makedirs(upload_dir, exist_ok=True)
        
        update_progress(10, "Saving uploaded file...")
        zip_path = os.path.join(upload_dir, zip_file.name)
        with open(zip_path, 'wb+') as destination:
            for chunk in zip_file.chunks():
                destination.write(chunk)
        
        # Process the dataset
        update_progress(15, "Extracting and validating images...")
        handler = DatasetHandler()
        result = handler.process_dataset(zip_path)
        
        if not result['success']:
            return Response(
                {'error': result.get('error', 'Failed to process dataset')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"Dataset processed: {result['total_images']} total images, {len(result['valid_images'])} valid, {len(result['student_images'])} student groups")
        
        # Map images to students in database
        student_mappings = {}
        unmapped_images = []
        
        update_progress(20, "Mapping students to database...")
        total_students_to_map = len(result['student_images'])
        
        with transaction.atomic():
            for idx, (student_id_str, image_paths) in enumerate(result['student_images'].items()):
                # Update progress
                if total_students_to_map > 0:
                    current_percent = 20 + int((idx / total_students_to_map) * 30)
                    update_progress(current_percent, f"Mapping student {student_id_str}...")
                
                try:
                    # Try to find student by student_id (case-insensitive)
                    # First try exact match
                    student = None
                    try:
                        student = Student.objects.get(student_id__iexact=student_id_str)
                    except Student.DoesNotExist:
                        # Try with variations (remove underscores, etc.)
                        clean_id = student_id_str.replace('_', '').replace('-', '').strip()
                        students = Student.objects.filter(student_id__iexact=clean_id)
                        if students.exists():
                            student = students.first()
                    
                    if student:
                        logger.info(f"Mapped student ID '{student_id_str}' to student: {student.user.get_full_name()}")
                        student_mappings[student_id_str] = {
                            'student_id': student.id,
                            'student_name': student.user.get_full_name(),
                            'images': []
                        }
                        
                        # Save images to StudentFaceImage model
                        for img_idx, img_path in enumerate(image_paths):
                            try:
                                # Copy image to media directory
                                with open(img_path, 'rb') as f:
                                    file_content = f.read()
                                
                                # Create filename based on student_id
                                filename = f"student_{student.student_id}_{img_idx}.jpg"
                                file_path = default_storage.save(
                                    f'student_faces/dataset/{filename}',
                                    ContentFile(file_content)
                                )
                                
                                # Create StudentFaceImage record
                                face_image = StudentFaceImage.objects.create(
                                    student=student,
                                    image=file_path,
                                    is_active=True
                                )
                                
                                student_mappings[student_id_str]['images'].append({
                                    'id': face_image.id,
                                    'path': file_path,
                                    'url': face_image.image.url if hasattr(face_image.image, 'url') else None
                                })
                            except Exception as e:
                                logger.error(f"Error saving image {img_path}: {e}")
                        
                        # Update student face enrollment status
                        student.face_images_count = StudentFaceImage.objects.filter(
                            student=student, is_active=True
                        ).count()
                        if student.face_images_count > 0:
                            student.is_face_enrolled = True
                            if not student.face_enrolled_at:
                                student.face_enrolled_at = timezone.now()
                        student.save()
                    else:
                        # Student not found
                        unmapped_images.append({
                            'student_id': student_id_str,
                            'image_count': len(image_paths),
                            'images': [os.path.basename(p) for p in image_paths[:5]]  # Show first 5 filenames
                        })
                        logger.warning(f"Student ID '{student_id_str}' not found in database. Images: {len(image_paths)}")
                    
                except Exception as e:
                    logger.error(f"Error processing student_id '{student_id_str}': {e}")
                    unmapped_images.append({
                        'student_id': student_id_str,
                        'image_count': len(image_paths),
                        'error': str(e)
                    })
        
        # Auto-train model if we have mapped students
        training_triggered = False
        training_result = None
        if len(student_mappings) > 0:
            logger.info(f"🔄 [AUTO-TRAIN] Auto-training model after dataset upload with {len(student_mappings)} students...")
            print(f"🔄 [AUTO-TRAIN] Auto-training model after dataset upload with {len(student_mappings)} students...")
            
            update_progress(50, "Preparing to train model...")
            
            try:
                # Get training data
                training_data = []
                for student_id_str, mapping in student_mappings.items():
                    for img_info in mapping['images']:
                        # Get full path
                        img_path = os.path.join(settings.MEDIA_ROOT, img_info['path'])
                        if os.path.exists(img_path):
                            training_data.append({
                                'image_path': img_path,
                                'student_id': student_id_str,
                                'face_image_id': img_info.get('id')
                            })
                
                if len(training_data) > 0:
                    logger.info(f"🔄 [AUTO-TRAIN] Preparing to train with {len(training_data)} images...")
                    update_progress(55, f"Starting training with {len(training_data)} images...")
                    
                    face_engine = get_face_engine()
                    start_time = datetime.now()
                    
                    # Define callback
                    def training_progress_callback(percent, msg):
                        # Map 0-100 training percent to 55-95 overall percent
                        overall = 55 + int(percent * 0.4)
                        update_progress(overall, msg)
                        
                    training_result = face_engine.train_model(training_data, progress_callback=training_progress_callback)
                    
                    end_time = datetime.now()
                    training_duration = (end_time - start_time).total_seconds()
                    
                    if training_result['success']:
                        logger.info(f"✅ [AUTO-TRAIN] Training completed in {training_duration:.2f} seconds")
                        update_progress(98, "Saving trained model...")
                        print(f"✅ [AUTO-TRAIN] Training completed in {training_duration:.2f} seconds")
                        # Reload the model to ensure it's in memory
                        face_engine.load_model()
                        
                        # Save model version
                        model_version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                        FaceRecognitionModel.objects.filter(is_active=True).update(is_active=False)
                        FaceRecognitionModel.objects.create(
                            model_version=model_version,
                            model_path=face_engine.model_path,
                            dataset_size=training_result['processed'],
                            training_duration_seconds=training_duration,
                            is_active=True,
                            notes=f"Auto-trained after dataset upload: {len(student_mappings)} students"
                        )
                        training_triggered = True
                        logger.info(f"✅ [AUTO-TRAIN] Model saved and activated: {model_version}")
                        print(f"✅ [AUTO-TRAIN] Model saved and activated: {model_version}")
                    else:
                        logger.error(f"❌ [AUTO-TRAIN] Training failed: {training_result.get('error')}")
                        print(f"❌ [AUTO-TRAIN] Training failed: {training_result.get('error')}")
            except Exception as e:
                logger.error(f"❌ [AUTO-TRAIN] Error during auto-training: {e}", exc_info=True)
                print(f"❌ [AUTO-TRAIN] Error during auto-training: {e}")
                # Don't fail the upload if training fails
        
        # Return response
        update_progress(100, "Processing complete!")
        response_data = {
            'success': True,
            'message': f"Dataset processed successfully",
            'total_images': result['total_images'],
            'valid_images': len(result['valid_images']),
            'mapped_students': len(student_mappings),
            'unmapped_students': len(unmapped_images),
            'student_mappings': student_mappings,
            'unmapped_images': unmapped_images,
            'invalid_images': result.get('invalid_images', [])[:10],  # Limit response size
            'auto_training': {
                'triggered': training_triggered,
                'success': training_result['success'] if training_result else False,
                'processed': training_result.get('processed', 0) if training_result else 0
            }
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error uploading dataset: {e}", exc_info=True)
        return Response(
            {'error': f'Error processing dataset: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def train_model(request):
    """
    Train/retrain the face recognition model using all enrolled student face images.
    """
    try:
        # Get all active student face images
        face_images = StudentFaceImage.objects.filter(is_active=True).select_related('student')
        
        if face_images.count() == 0:
            return Response(
                {'error': 'No face images found. Please upload a dataset first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare training data
        training_data = []
        for face_image in face_images:
            image_path = face_image.image.path if hasattr(face_image.image, 'path') else None
            if image_path and os.path.exists(image_path):
                training_data.append({
                    'image_path': image_path,
                    'student_id': face_image.student.student_id
                })
        
        if len(training_data) == 0:
            return Response(
                {'error': 'No valid image files found for training.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if face recognition is available
        if not FACE_RECOGNITION_AVAILABLE:
            return Response(
                {
                    'error': 'Face recognition module is not installed on the server. Training skipped.',
                    'code': 'MODULE_NOT_AVAILABLE',
                    'details': 'Install dlib and face_recognition to enable this feature.'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Train the model
        logger.info(f"🎯 [TRAINING] Starting model training with {len(training_data)} images...")
        print(f"🎯 [TRAINING] Starting model training with {len(training_data)} images...")
        
        face_engine = get_face_engine()
        start_time = datetime.now()
        training_result = face_engine.train_model(training_data)
        end_time = datetime.now()
        training_duration = (end_time - start_time).total_seconds()
        
        logger.info(f"⏱️ [TRAINING] Training completed in {training_duration:.2f} seconds")
        print(f"⏱️ [TRAINING] Training completed in {training_duration:.2f} seconds")
        
        if not training_result['success']:
            return Response(
                {'error': training_result.get('error', 'Training failed')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reload the model to ensure it's in memory
        face_engine.load_model()
        
        # Save model version to database
        model_version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        model_path = face_engine.model_path
        
        # Deactivate previous models
        FaceRecognitionModel.objects.filter(is_active=True).update(is_active=False)
        
        # Create new model record
        model_record = FaceRecognitionModel.objects.create(
            model_version=model_version,
            model_path=model_path,
            dataset_size=training_result['processed'],
            training_duration_seconds=training_duration,
            is_active=True,
            notes=f"Auto-trained from {training_result['unique_students']} students"
        )
        
        return Response({
            'success': True,
            'message': 'Model trained successfully',
            'model_version': model_version,
            'model_id': model_record.id,
            'dataset_size': training_result['processed'],
            'unique_students': training_result['unique_students'],
            'training_duration_seconds': training_duration,
            'errors': training_result.get('errors', [])[:10]  # Limit errors in response
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error training model: {e}", exc_info=True)
        return Response(
            {'error': f'Error training model: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance_face(request):
    """
    Mark attendance using face recognition from uploaded image.
    """
    try:
        if 'image' not in request.FILES:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image_file = request.FILES['image']
        
        # Save uploaded image temporarily
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'attendance_temp')
        os.makedirs(upload_dir, exist_ok=True)
        
        temp_path = os.path.join(upload_dir, f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg")
        with open(temp_path, 'wb+') as destination:
            for chunk in image_file.chunks():
                destination.write(chunk)
        
        # Recognize face
        face_engine = get_face_engine()
        recognition_result = face_engine.recognize_face(temp_path)
        
        if not recognition_result or not recognition_result.get('matched'):
            # Save captured image for review
            captured_image_path = default_storage.save(
                f'attendance_captures/unrecognized_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg',
                ContentFile(open(temp_path, 'rb').read())
            )
            os.remove(temp_path)
            
            return Response({
                'success': False,
                'error': 'Face not recognized',
                'confidence': recognition_result.get('confidence', 0) if recognition_result else 0,
                'message': 'No matching student found. Please try again or use manual attendance.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find student
        try:
            student = Student.objects.get(student_id=recognition_result['student_id'])
        except Student.DoesNotExist:
            os.remove(temp_path)
            return Response(
                {'error': f"Student {recognition_result['student_id']} not found in database"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if attendance already recorded for today
        today = timezone.now().date()
        existing_record = AttendanceRecord.objects.filter(
            student=student, date=today
        ).first()
        
        if existing_record:
            os.remove(temp_path)
            return Response({
                'success': True,
                'message': f'Attendance already recorded for {student.user.get_full_name()}',
                'student_name': student.user.get_full_name(),
                'student_id': student.student_id,
                'status': existing_record.status,
                'timestamp': existing_record.timestamp,
                'already_recorded': True
            }, status=status.HTTP_200_OK)
        
        # Save captured image
        with open(temp_path, 'rb') as f:
            captured_image_content = f.read()
        
        captured_image_path = default_storage.save(
            f'attendance_captures/{student.student_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.jpg',
            ContentFile(captured_image_content)
        )
        os.remove(temp_path)
        
        # Create attendance record
        with transaction.atomic():
            attendance_record = AttendanceRecord.objects.create(
                student=student,
                date=today,
                status='present',
                method='face',
                recorded_by=request.user,
                captured_image=captured_image_path,
                confidence_score=recognition_result['confidence'],
                face_match_student_id=recognition_result['student_id']
            )
            
            # Update daily summary
            from .views import update_daily_summary
            update_daily_summary(today)
        
        # Return success response
        serializer = AttendanceRecordSerializer(attendance_record, context={'request': request})
        return Response({
            'success': True,
            'message': f'Attendance recorded for {student.user.get_full_name()}',
            'student_name': student.user.get_full_name(),
            'student_id': student.student_id,
            'grade': student.grade,
            'status': 'present',
            'confidence': recognition_result['confidence'],
            'timestamp': attendance_record.timestamp,
            'record': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error marking attendance with face recognition: {e}", exc_info=True)
        return Response(
            {'error': f'Error processing attendance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def model_status(request):
    """
    Get current face recognition model status.
    """
    try:
        face_engine = get_face_engine()
        model_info = face_engine.get_model_info()
        
        # Get latest model record from database
        latest_model = FaceRecognitionModel.objects.filter(is_active=True).first()
        
        # Get enrollment statistics
        enrolled_students = Student.objects.filter(is_face_enrolled=True).count()
        total_face_images = StudentFaceImage.objects.filter(is_active=True).count()
        
        response_data = {
            'model_loaded': model_info['loaded'],
            'encoding_count': model_info.get('encoding_count', 0),
            'unique_students_in_model': model_info.get('unique_students', 0),
            'model_path': model_info.get('model_path'),
            'model_exists': model_info.get('model_exists', False),
            'enrolled_students': enrolled_students,
            'total_face_images': total_face_images,
        }
        
        if latest_model:
            response_data['latest_model'] = {
                'version': latest_model.model_version,
                'training_date': latest_model.training_date,
                'dataset_size': latest_model.dataset_size,
                'accuracy': latest_model.accuracy,
                'training_duration_seconds': latest_model.training_duration_seconds
            }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting model status: {e}", exc_info=True)
        return Response(
            {'error': f'Error getting model status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def enrolled_students(request):
    """
    Get list of students enrolled in face recognition system.
    """
    try:
        from users.serializers import StudentSerializer
        
        enrolled_students = Student.objects.filter(is_face_enrolled=True).select_related('user')
        
        # Get face image counts
        students_data = []
        for student in enrolled_students:
            face_images_count = StudentFaceImage.objects.filter(student=student, is_active=True).count()
            students_data.append({
                'id': student.id,
                'student_id': student.student_id,
                'full_name': student.user.get_full_name(),
                'grade': student.grade,
                'face_images_count': face_images_count,
                'face_enrolled_at': student.face_enrolled_at,
                'face_image_url': request.build_absolute_uri(student.face_image.url) if student.face_image else None
            })
        
        return Response({
            'success': True,
            'count': len(students_data),
            'students': students_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting enrolled students: {e}", exc_info=True)
        return Response(
            {'error': f'Error getting enrolled students: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_upload_progress(request):
    """
    Get progress of a dataset upload/processing task.
    Expecting 'task_id' query param.
    """
    task_id = request.query_params.get('task_id')
    if not task_id:
        return Response({'error': 'task_id required'}, status=status.HTTP_400_BAD_REQUEST)
    
    progress_data = cache.get(f'dataset_progress_{task_id}')
    if progress_data:
        return Response(progress_data)
    else:
        return Response({'percent': 0, 'status': 'unknown', 'message': 'Initializing...'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_student_with_face(request):
    """
    Register a new student and enroll their face immediately.
    Expects:
    - first_name, last_name, student_id, grade, gender, parent_email (optional)
    - image (file)
    """
    try:
        from users.serializers import StudentRegistrationSerializer
        
        # Check if updating existing student
        existing_student_id = request.data.get('student_id')
        existing_student = None
        
        if existing_student_id:
            try:
                existing_student = Student.objects.get(student_id=existing_student_id)
            except Student.DoesNotExist:
                existing_student = None
                
        if existing_student:
            student = existing_student
            logger.info(f"Adding face to existing student: {student.student_id}")
            
            with transaction.atomic():
                # Just save face image and retrain
                pass 
        else:
             # Extract user fields
            user_data = {
                'username': request.data.get('student_id'), # Default username to student_id
                'first_name': request.data.get('first_name'),
                'last_name': request.data.get('last_name'),
                'email': request.data.get('email', ''), # Optional
                'password': 'student123', # Default password for all students
                'role': 'student'
            }
            
            student_data = {
                'user': user_data,
                'student_id': request.data.get('student_id'),
                'grade': request.data.get('grade'),
                'gender': request.data.get('gender', 'other'),
                'parent_email': request.data.get('parent_email', '')
            }
            
            # Use Serializer to validate
            serializer = StudentRegistrationSerializer(data=student_data)
            if not serializer.is_valid():
                 return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                 
            # Create Student
            with transaction.atomic():
                student = serializer.save()
        
        # Shared block for saving face and training (indented to handle both cases)
        with transaction.atomic():
            # If it's a new transaction block for existing student (nested atomic is fine)
            
            # Save Face Image uses 'student' variable which is set above
            if 'image' in request.FILES:
                image_file = request.FILES['image']
                
                # Save to media
                filename = f"student_{student.student_id}_registration.jpg"
                file_path = default_storage.save(
                    f'student_faces/dataset/{filename}',
                    ContentFile(image_file.read())
                )
                
                # Create StudentFaceImage
                StudentFaceImage.objects.create(
                    student=student,
                    image=file_path,
                    is_active=True
                )
                
                # Update student
                student.is_face_enrolled = True
                student.face_enrolled_at = timezone.now()
                student.save()
                
                # Train Model (Fast Retrain using Cache)
                face_engine = get_face_engine()
                
                # Build training data
                all_images = StudentFaceImage.objects.filter(is_active=True).select_related('student')
                train_data = []
                for img in all_images:
                     if hasattr(img.image, 'path') and os.path.exists(img.image.path):
                         train_data.append({
                             'image_path': img.image.path,
                             'student_id': img.student.student_id,
                             'face_image_id': img.id
                         })
                         
                if len(train_data) > 0:
                     training_result = face_engine.train_model(train_data)
                     if training_result['success']:
                         face_engine.load_model()
                         
                         # Save model version
                         model_version = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                         FaceRecognitionModel.objects.filter(is_active=True).update(is_active=False)
                         FaceRecognitionModel.objects.create(
                             model_version=model_version,
                             model_path=face_engine.model_path,
                             dataset_size=training_result['processed'],
                             training_duration_seconds=0, # approximate
                             is_active=True,
                             notes=f"Auto-trained after new student registration: {student.student_id}"
                         )

        return Response({
            'success': True,
            'message': 'Student registered and face enrolled successfully',
            'student_id': student.student_id,
            'student_name': student.user.get_full_name()
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"Error registering student with face: {e}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
