# Face Recognition System - Setup Guide

## Overview

This document describes the complete face recognition system implementation for the Automated Attendance System for Rural Schools project. The system now includes:

1. **Face Recognition Engine** - Complete face detection and recognition using face_recognition library
2. **Dataset Upload** - ZIP file upload with automatic extraction and validation
3. **Auto-Training** - Automatic model training when new datasets are uploaded
4. **Attendance Marking** - Face recognition-based attendance marking via camera
5. **Model Management** - Model versioning and training logs
6. **Beautiful UI** - Modern, responsive frontend interface

## New Features Added

### Backend

1. **Database Models** (in `backend/attendance/models.py`):
   - `FaceRecognitionModel` - Tracks model versions and training history
   - `StudentFaceImage` - Stores multiple face images per student
   - Extended `AttendanceRecord` - Added face recognition fields (method, confidence_score, captured_image)
   - Extended `Student` - Added face enrollment fields (face_image, face_encoding, is_face_enrolled)

2. **Face Recognition Engine** (`backend/utils/face_recognition_utils.py`):
   - Face detection and encoding
   - Face recognition with confidence scoring
   - Model training from dataset
   - Model saving and loading

3. **Dataset Handler** (`backend/utils/dataset_handler.py`):
   - ZIP file extraction
   - Image validation (single face check)
   - Student ID extraction from filenames
   - Dataset organization by student

4. **API Endpoints** (`backend/attendance/face_views.py`):
   - `POST /api/attendance/face/dataset/upload/` - Upload ZIP dataset
   - `POST /api/attendance/face/model/train/` - Train/retrain model
   - `POST /api/attendance/face/record/` - Mark attendance via face recognition
   - `GET /api/attendance/face/model/status/` - Get model status

### Frontend

1. **Face Recognition Page** (`frontend/react_app/src/pages/FaceRecognition.js`):
   - Model status dashboard
   - Dataset upload interface
   - Model training controls
   - Usage instructions

2. **Face Recognition Camera Component** (`frontend/react_app/src/components/FaceRecognitionCamera.js`):
   - Live camera feed
   - Face capture and recognition
   - Real-time attendance marking
   - Result display with confidence scores

3. **Dataset Upload Component** (`frontend/react_app/src/components/DatasetUpload.js`):
   - Drag-and-drop ZIP file upload
   - Processing status and statistics
   - Student mapping results
   - Auto-training status

4. **Updated Attendance Page**:
   - Face recognition button integrated
   - Camera modal for quick attendance marking

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Note**: The face recognition dependencies include:
- `face-recognition==1.3.0` - Main face recognition library
- `opencv-python==4.8.1.78` - Image processing
- `dlib==19.24.2` - Face detection backend
- `numpy==1.24.3` - Numerical operations

**Important**: On Windows, automatic installation of `dlib` often fails because it requires C++ build tools.

#### Option 1: Install Visual Studio Build Tools (Recommended)
1. Download **Visual Studio Build Tools** from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. Run the installer and select **"Desktop development with C++"**.
3. Ensure **"CMake"** is selected in the installation details.
4. Install and restart your computer.
5. Then run:
   ```bash
   pip install cmake
   pip install dlib
   pip install face-recognition
   ```

#### Option 2: Pre-built Wheels
If you cannot install Build Tools, look for a pre-compiled wheel file (`.whl`) for `dlib` compatible with Python 3.10 and Windows 64-bit (e.g., `dlib-19.22.99-cp310-cp310-win_amd64.whl`) and install it directly:
```bash
pip install path/to/dlib_wheel_file.whl
pip install face-recognition
```

**Graceful Fallback**:
If you cannot install these libraries, the application *will still work*. The face recognition features will simply be disabled, and you will see a warning message instead of a crash.

### 2. Create Database Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

This will create the following new tables:
- `face_recognition_models`
- `student_face_images`
- New fields in `students` table
- New fields in `attendance_records` table

### 3. Create Required Directories

The system will automatically create these directories, but you can create them manually:

```bash
mkdir -p backend/media/student_faces/dataset
mkdir -p backend/media/attendance_captures
mkdir -p backend/media/dataset_uploads
mkdir -p backend/media/datasets
mkdir -p backend/models
```

### 4. Start the Development Server

```bash
# Backend
cd backend
python manage.py runserver

# Frontend (in a new terminal)
cd frontend/react_app
npm install
npm start
```

## Usage Workflow

### Step 1: Register Students

1. Go to **Students** page
2. Add students with their Student IDs (e.g., STU001, STU002, etc.)

### Step 2: Prepare Dataset

1. Collect student face images (JPG, PNG format)
2. Name images with student IDs:
   - `STU001.jpg`
   - `STU002.jpg`
   - `STU003_1.jpg` (multiple images per student supported)
3. Create a ZIP file containing all images

### Step 3: Upload Dataset

1. Go to **Face Recognition** page
2. Click **Upload Dataset**
3. Select the ZIP file
4. Wait for processing
5. The system will:
   - Extract images
   - Validate each image (check for single face)
   - Map images to students by Student ID
   - Auto-train the model

### Step 4: Mark Attendance

1. Go to **Attendance** page or **Face Recognition** page
2. Click **Face Recognition** or **Mark Attendance** button
3. Allow camera access when prompted
4. Position face in the camera frame
5. Click **Capture & Recognize**
6. System will:
   - Detect face
   - Match with enrolled students
   - Record attendance automatically
   - Display result with confidence score

### Step 5: Monitor Model Status

- View model status on **Face Recognition** page
- Check enrolled students count
- View training history
- Retrain model manually if needed

## API Endpoints

### Upload Dataset
```
POST /api/attendance/face/dataset/upload/
Content-Type: multipart/form-data
Body: dataset (ZIP file)

Response: {
  "success": true,
  "total_images": 100,
  "valid_images": 95,
  "mapped_students": 20,
  "unmapped_students": 2,
  "auto_training": {
    "triggered": true,
    "success": true,
    "processed": 95
  }
}
```

### Train Model
```
POST /api/attendance/face/model/train/

Response: {
  "success": true,
  "model_version": "v20241201_143022",
  "dataset_size": 95,
  "unique_students": 20,
  "training_duration_seconds": 12.5
}
```

### Mark Attendance
```
POST /api/attendance/face/record/
Content-Type: multipart/form-data
Body: image (image file)

Response: {
  "success": true,
  "student_name": "John Doe",
  "student_id": "STU001",
  "confidence": 0.95,
  "timestamp": "2024-12-01T14:30:22Z"
}
```

### Model Status
```
GET /api/attendance/face/model/status/

Response: {
  "model_loaded": true,
  "encoding_count": 95,
  "enrolled_students": 20,
  "total_face_images": 95,
  "latest_model": {
    "version": "v20241201_143022",
    "training_date": "2024-12-01T14:30:22Z",
    "dataset_size": 95
  }
}
```

## Dataset Format

### ZIP File Structure
```
dataset.zip
├── STU001.jpg
├── STU001_1.jpg (optional, multiple images per student)
├── STU002.jpg
├── STU003.jpg
└── ...
```

### Naming Convention
- Primary format: `{STUDENT_ID}.jpg` (e.g., `STU001.jpg`)
- Multiple images: `{STUDENT_ID}_{INDEX}.jpg` (e.g., `STU001_1.jpg`)
- The system extracts Student ID from filename

### Image Requirements
- Single face per image
- Clear, well-lit images
- Front-facing photos preferred
- Supported formats: JPG, JPEG, PNG

## Troubleshooting

### Model Not Training
- Ensure students are registered before uploading dataset
- Check that images contain single faces
- Verify ZIP file is not corrupted

### Face Not Recognized
- Ensure student is enrolled (images uploaded)
- Check lighting conditions
- Try better quality image
- Retrain model with more images

### Camera Not Working
- Check browser permissions
- Use HTTPS (required for camera access in some browsers)
- Try different browser

### Installation Issues (dlib)
- On Windows, use: `pip install dlib-binary`
- On Linux: `sudo apt-get install cmake` then `pip install dlib`
- On Mac: `brew install cmake` then `pip install dlib`

## Database Schema Changes

### New Tables

**face_recognition_models**
- model_version (unique)
- model_path
- training_date
- dataset_size
- accuracy
- is_active
- training_duration_seconds

**student_face_images**
- student (FK)
- image (ImageField)
- uploaded_at
- is_active
- encoding_cached

### Modified Tables

**students**
- face_image (ImageField)
- face_encoding (TextField)
- is_face_enrolled (Boolean)
- face_enrolled_at (DateTime)
- face_images_count (Integer)

**attendance_records**
- method (CharField: 'rfid', 'face', 'manual')
- captured_image (ImageField)
- confidence_score (FloatField)
- face_match_student_id (CharField)

## Security Considerations

1. **Face Data Privacy**: Face images are stored securely in media directory
2. **Access Control**: All endpoints require authentication
3. **Admin Controls**: Model training restricted to admin/teacher roles
4. **Data Validation**: Images validated before processing

## Performance Notes

- Model training time depends on dataset size (approximately 1-2 seconds per image)
- Face recognition is fast (< 1 second per recognition)
- Model is loaded once at startup for optimal performance
- Large datasets (>1000 images) may take several minutes to train

## Future Enhancements

Potential improvements:
1. Batch face enrollment from webcam
2. Face recognition accuracy improvement over time
3. Multi-face detection in single image
4. Real-time video streaming recognition
5. Mobile app integration
6. Offline mode support

## Support

For issues or questions:
1. Check the logs: `backend/logs/edurfid.log`
2. Verify database migrations are applied
3. Ensure all dependencies are installed correctly
4. Check file permissions on media directories

---

**Note**: This implementation is production-ready and follows the Smart India Hackathon problem statement requirements for a low-cost, user-friendly face recognition system for rural schools.

