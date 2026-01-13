"""
User models for EDURFID system.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class School(models.Model):
    """School model for managing school information."""
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=300)
    connectivity_status = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'schools'

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Extended User model with roles."""
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('teacher', 'Teacher'),
        ('auxiliary', 'Auxiliary Staff'),
        ('student', 'Student'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    school = models.ForeignKey(School, on_delete=models.CASCADE, null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_offline_sync_enabled = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)

    # Fix the reverse accessor conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name="edurfid_user_set",
        related_query_name="edurfid_user",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="edurfid_user_set",
        related_query_name="edurfid_user",
    )

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Student(models.Model):
    """Student model for managing student information."""
    GRADE_CHOICES = [
        ('1', 'Grade 1'),
        ('2', 'Grade 2'),
        ('3', 'Grade 3'),
        ('4', 'Grade 4'),
        ('5', 'Grade 5'),
        ('6', 'Grade 6'),
        ('7', 'Grade 7'),
        ('8', 'Grade 8'),
        ('9', 'Grade 9'),
        ('10', 'Grade 10'),
        ('11', 'Grade 11'),
        ('12', 'Grade 12'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.CharField(max_length=20, unique=True)
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES)
    parent_contact = models.CharField(max_length=20, blank=True)
    parent_email = models.EmailField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    enrollment_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    # Face Recognition Fields
    face_encoding = models.TextField(blank=True, null=True, help_text="Stored face encoding (JSON)")
    face_image = models.ImageField(upload_to='student_faces/', blank=True, null=True, help_text="Primary face image for recognition")
    face_images_count = models.IntegerField(default=0, help_text="Number of face images in dataset")
    is_face_enrolled = models.BooleanField(default=False, help_text="Whether face data is enrolled")
    face_enrolled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'students'

    def __str__(self):
        return f"{self.user.get_full_name()} - Grade {self.grade}"


class RFIDCard(models.Model):
    """RFID Card model for managing student cards."""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('lost', 'Lost'),
        ('damaged', 'Damaged'),
    ]

    card_id = models.CharField(max_length=50, unique=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='rfid_cards')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    issued_date = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'rfid_cards'

    def __str__(self):
        return f"Card {self.card_id} - {self.student.user.get_full_name()}"

    def update_last_used(self):
        """Update the last used timestamp."""
        self.last_used = timezone.now()
        self.save(update_fields=['last_used'])
