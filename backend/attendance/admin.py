"""
Admin configuration for attendance app.
"""
from django.contrib import admin
from .models import (
    AttendanceRecord, AttendanceSummary, AttendanceAlert, 
    RFIDScan, FaceRecognitionModel, StudentFaceImage
)


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'date', 'status', 'method', 'confidence_score', 'timestamp']
    list_filter = ['status', 'method', 'date']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__student_id']
    readonly_fields = ['timestamp', 'synced_at']
    date_hierarchy = 'date'


@admin.register(AttendanceSummary)
class AttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_students', 'present_count', 'absent_count', 'attendance_percentage']
    list_filter = ['date']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'date'


@admin.register(AttendanceAlert)
class AttendanceAlertAdmin(admin.ModelAdmin):
    list_display = ['student', 'alert_type', 'is_sent', 'is_resolved', 'created_at']
    list_filter = ['alert_type', 'is_sent', 'is_resolved', 'created_at']
    search_fields = ['student__user__first_name', 'student__user__last_name']
    readonly_fields = ['created_at', 'sent_at', 'resolved_at']


@admin.register(RFIDScan)
class RFIDScanAdmin(admin.ModelAdmin):
    list_display = ['card_id', 'student', 'scan_timestamp', 'is_processed']
    list_filter = ['is_processed', 'scan_timestamp']
    search_fields = ['card_id', 'student__user__first_name', 'student__student_id']
    readonly_fields = ['scan_timestamp', 'processed_at']


@admin.register(FaceRecognitionModel)
class FaceRecognitionModelAdmin(admin.ModelAdmin):
    list_display = ['model_version', 'training_date', 'dataset_size', 'accuracy', 'is_active']
    list_filter = ['is_active', 'training_date']
    readonly_fields = ['training_date']
    date_hierarchy = 'training_date'


@admin.register(StudentFaceImage)
class StudentFaceImageAdmin(admin.ModelAdmin):
    list_display = ['student', 'uploaded_at', 'is_active']
    list_filter = ['is_active', 'uploaded_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__student_id']
    readonly_fields = ['uploaded_at']
    date_hierarchy = 'uploaded_at'
