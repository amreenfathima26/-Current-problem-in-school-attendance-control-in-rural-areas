"""
Attendance models for EDURFID system.
"""
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from users.models import Student


class AttendanceRecord(models.Model):
    """Model for tracking student attendance."""
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ]
    
    METHOD_CHOICES = [
        ('rfid', 'RFID'),
        ('face', 'Face Recognition'),
        ('manual', 'Manual'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(default=timezone.now)
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='present')
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, default='manual', help_text="Method used to record attendance")
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    is_offline_record = models.BooleanField(default=False)
    synced_at = models.DateTimeField(null=True, blank=True)
    
    # Face Recognition specific fields
    captured_image = models.ImageField(upload_to='attendance_captures/', blank=True, null=True, help_text="Image captured during face recognition")
    confidence_score = models.FloatField(null=True, blank=True, help_text="Confidence score from face recognition (0-1)")
    face_match_student_id = models.CharField(max_length=20, blank=True, null=True, help_text="Student ID matched by face recognition")

    class Meta:
        db_table = 'attendance_records'
        unique_together = ['student', 'date']

    def __str__(self):
        return f"{self.student.user.get_full_name()} - {self.date} - {self.status}"

    def sync_to_online(self):
        """Mark record as synced to online database."""
        self.is_offline_record = False
        self.synced_at = timezone.now()
        self.save(update_fields=['is_offline_record', 'synced_at'])


class AttendanceSummary(models.Model):
    """Model for daily attendance summaries."""
    date = models.DateField(unique=True)
    total_students = models.PositiveIntegerField(default=0)
    present_count = models.PositiveIntegerField(default=0)
    absent_count = models.PositiveIntegerField(default=0)
    late_count = models.PositiveIntegerField(default=0)
    excused_count = models.PositiveIntegerField(default=0)
    attendance_percentage = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0.0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance_summaries'
        ordering = ['-date']

    def __str__(self):
        return f"Attendance Summary - {self.date} ({self.attendance_percentage:.1f}%)"

    def calculate_percentage(self):
        """Calculate attendance percentage."""
        if self.total_students > 0:
            present_total = self.present_count + self.late_count + self.excused_count
            self.attendance_percentage = (present_total / self.total_students) * 100
        else:
            self.attendance_percentage = 0.0
        return self.attendance_percentage

    def save(self, *args, **kwargs):
        self.calculate_percentage()
        super().save(*args, **kwargs)


class AttendanceAlert(models.Model):
    """Model for attendance alerts and notifications."""
    ALERT_TYPE_CHOICES = [
        ('absence', 'Student Absence'),
        ('pattern', 'Attendance Pattern'),
        ('threshold', 'Low Attendance Threshold'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance_alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = models.TextField()
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'attendance_alerts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.alert_type} - {self.student.user.get_full_name()}"

    def mark_as_sent(self):
        """Mark alert as sent."""
        self.is_sent = True
        self.sent_at = timezone.now()
        self.save(update_fields=['is_sent', 'sent_at'])

    def mark_as_resolved(self):
        """Mark alert as resolved."""
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.save(update_fields=['is_resolved', 'resolved_at'])


class RFIDScan(models.Model):
    """Model for tracking RFID scans."""
    card_id = models.CharField(max_length=50)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True)
    scan_timestamp = models.DateTimeField(auto_now_add=True)
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'rfid_scans'
        ordering = ['-scan_timestamp']

    def __str__(self):
        return f"RFID Scan - {self.card_id} at {self.scan_timestamp}"

    def mark_as_processed(self):
        """Mark scan as processed."""
        self.is_processed = True
        self.processed_at = timezone.now()
        self.save(update_fields=['is_processed', 'processed_at'])


class FaceRecognitionModel(models.Model):
    """Model for tracking face recognition model training and versions."""
    model_version = models.CharField(max_length=50, unique=True, help_text="Version identifier for the model")
    model_path = models.CharField(max_length=500, help_text="Path to saved model file")
    training_date = models.DateTimeField(auto_now_add=True)
    dataset_size = models.IntegerField(default=0, help_text="Number of images used for training")
    accuracy = models.FloatField(null=True, blank=True, help_text="Model accuracy (0-1)")
    is_active = models.BooleanField(default=True, help_text="Whether this model version is currently active")
    training_duration_seconds = models.FloatField(null=True, blank=True, help_text="Time taken to train the model")
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'face_recognition_models'
        ordering = ['-training_date']

    def __str__(self):
        return f"Face Recognition Model v{self.model_version} - {self.training_date.strftime('%Y-%m-%d %H:%M')}"


class StudentFaceImage(models.Model):
    """Model for storing multiple face images per student for training."""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='face_images')
    image = models.ImageField(upload_to='student_faces/dataset/', help_text="Face image for training")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, help_text="Whether this image is used for training")
    encoding = models.TextField(blank=True, null=True, help_text="JSON representation of 128-d face encoding vector")
    encoding_cached = models.BooleanField(default=False, help_text="Whether face encoding is cached")

    class Meta:
        db_table = 'student_face_images'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Face Image for {self.student.user.get_full_name()} - {self.uploaded_at.strftime('%Y-%m-%d')}"
