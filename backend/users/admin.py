"""
Admin configuration for users app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, School, Student, RFIDCard


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'connectivity_status', 'created_at']
    list_filter = ['connectivity_status', 'created_at']
    search_fields = ['name', 'location']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'school', 'is_active']
    list_filter = ['role', 'is_active', 'school', 'is_staff', 'is_superuser']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['username']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('role', 'school', 'phone_number', 'is_offline_sync_enabled', 'last_sync')}),
    )


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['user', 'student_id', 'grade', 'parent_contact', 'is_active', 'enrollment_date']
    list_filter = ['grade', 'is_active', 'enrollment_date']
    search_fields = ['student_id', 'user__first_name', 'user__last_name', 'user__username']
    ordering = ['student_id']


@admin.register(RFIDCard)
class RFIDCardAdmin(admin.ModelAdmin):
    list_display = ['card_id', 'student', 'status', 'issued_date', 'last_used']
    list_filter = ['status', 'issued_date']
    search_fields = ['card_id', 'student__user__first_name', 'student__user__last_name']
    ordering = ['card_id']
