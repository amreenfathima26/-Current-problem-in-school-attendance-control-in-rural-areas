"""
Attendance serializers for EDURFID system.
"""
from rest_framework import serializers
from .models import AttendanceRecord, AttendanceSummary, AttendanceAlert, RFIDScan
from users.serializers import StudentSerializer


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for AttendanceRecord model."""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)
    grade = serializers.CharField(source='student.grade', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    captured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'student', 'student_name', 'student_id', 'grade', 'date', 
            'timestamp', 'status', 'method', 'notes', 'recorded_by', 'recorded_by_name',
            'is_offline_record', 'synced_at', 'captured_image', 'captured_image_url',
            'confidence_score', 'face_match_student_id'
        ]
        read_only_fields = ['id', 'timestamp', 'synced_at']
    
    def get_captured_image_url(self, obj):
        """Get URL for captured image."""
        if obj.captured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.captured_image.url)
            return obj.captured_image.url
        return None


class AttendanceSummarySerializer(serializers.ModelSerializer):
    """Serializer for AttendanceSummary model."""
    
    class Meta:
        model = AttendanceSummary
        fields = [
            'id', 'date', 'total_students', 'present_count', 'absent_count',
            'late_count', 'excused_count', 'attendance_percentage', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttendanceAlertSerializer(serializers.ModelSerializer):
    """Serializer for AttendanceAlert model."""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = AttendanceAlert
        fields = [
            'id', 'student', 'student_name', 'student_id', 'alert_type',
            'message', 'is_sent', 'sent_at', 'created_at', 'is_resolved',
            'resolved_at'
        ]
        read_only_fields = ['id', 'sent_at', 'created_at', 'resolved_at']


class RFIDScanSerializer(serializers.ModelSerializer):
    """Serializer for RFIDScan model."""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    student_id = serializers.CharField(source='student.student_id', read_only=True)

    class Meta:
        model = RFIDScan
        fields = [
            'id', 'card_id', 'student', 'student_name', 'student_id',
            'scan_timestamp', 'is_processed', 'processed_at', 'error_message'
        ]
        read_only_fields = ['id', 'scan_timestamp', 'processed_at']


class DailyAttendanceSerializer(serializers.Serializer):
    """Serializer for daily attendance data."""
    date = serializers.DateField()
    total_students = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
    excused_count = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()
    students = AttendanceRecordSerializer(many=True)


class AttendanceStatsSerializer(serializers.Serializer):
    """Serializer for attendance statistics."""
    period = serializers.CharField()
    total_days = serializers.IntegerField()
    average_attendance = serializers.FloatField()
    best_day = serializers.DateField()
    worst_day = serializers.DateField()
    total_present = serializers.IntegerField()
    total_absent = serializers.IntegerField()
    total_late = serializers.IntegerField()
    total_excused = serializers.IntegerField()


class StudentAttendanceHistorySerializer(serializers.Serializer):
    """Serializer for student attendance history."""
    student = serializers.SerializerMethodField()
    total_days = serializers.IntegerField()
    present_days = serializers.IntegerField()
    absent_days = serializers.IntegerField()
    late_days = serializers.IntegerField()
    excused_days = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()
    recent_records = serializers.SerializerMethodField()
    
    def get_student(self, obj):
        """Get student data with context."""
        student = obj.get('student')
        if student:
            return StudentSerializer(student, context=self.context).data
        return None
    
    def get_recent_records(self, obj):
        """Get recent records with context."""
        records = obj.get('recent_records', [])
        if records:
            return AttendanceRecordSerializer(records, many=True, context=self.context).data
        return []
