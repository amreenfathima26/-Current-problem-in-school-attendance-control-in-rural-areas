"""
Attendance URLs for EDURFID system.
"""
from django.urls import path
from . import views
from . import face_views

urlpatterns = [
    # Attendance record endpoints
    path('records/', views.AttendanceRecordListCreateView.as_view(), name='attendance_record_list_create'),
    path('records/<int:pk>/', views.AttendanceRecordDetailView.as_view(), name='attendance_record_detail'),
    
    # RFID endpoints
    path('record/', views.record_attendance_from_rfid, name='record_attendance_from_rfid'),
    path('rfid-scans/', views.RFIDScanListView.as_view(), name='rfid_scan_list'),
    
    # Face Recognition endpoints
    path('face/record/', face_views.mark_attendance_face, name='mark_attendance_face'),
    path('face/dataset/upload/', face_views.upload_dataset, name='upload_dataset'),
    path('face/dataset/progress/', face_views.get_upload_progress, name='get_upload_progress'),
    path('face/student/register/', face_views.register_student_with_face, name='register_student_with_face'),
    path('face/model/train/', face_views.train_model, name='train_model'),
    path('face/model/status/', face_views.model_status, name='model_status'),
    path('face/enrolled-students/', face_views.enrolled_students, name='enrolled_students'),
    
    # Daily attendance endpoints
    path('daily/', views.daily_attendance, name='daily_attendance'),
    
    # Statistics endpoints
    path('stats/', views.attendance_stats, name='attendance_stats'),
    path('students/<int:student_id>/history/', views.student_attendance_history, name='student_attendance_history'),
    
    # Summary endpoints
    path('summaries/', views.AttendanceSummaryListView.as_view(), name='attendance_summary_list'),
    
    # Alert endpoints
    path('alerts/', views.get_attendance_alerts, name='attendance_alert_list'),
]
