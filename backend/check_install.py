
import sys
try:
    import dlib
    print(f"✅ dlib: {dlib.__version__}")
except ImportError as e:
    print(f"❌ dlib failed: {e}")

try:
    import face_recognition
    print(f"✅ face_recognition: {face_recognition.__version__}")
except ImportError as e:
    print(f"❌ face_recognition failed: {e}")

try:
    import cv2
    print(f"✅ cv2: {cv2.__version__}")
except ImportError as e:
    print(f"❌ cv2 failed: {e}")

try:
    import numpy
    print(f"✅ numpy: {numpy.__version__}")
except ImportError as e:
    print(f"❌ numpy failed: {e}")

try:
    import django
    print(f"✅ django: {django.get_version()}")
except ImportError as e:
    print(f"❌ django failed: {e}")
