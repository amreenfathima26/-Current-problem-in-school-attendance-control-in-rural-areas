"""
User URLs for EDURFID system.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('profile/update/', views.update_profile_view, name='update_profile'),
    
    # School endpoints
    path('schools/', views.SchoolListCreateView.as_view(), name='school_list_create'),
    
    # User endpoints
    path('users/', views.UserListCreateView.as_view(), name='user_list_create'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    path('users/<int:pk>/update/', views.admin_update_user, name='admin_update_user'),
    path('users/<int:pk>/toggle-status/', views.toggle_user_status, name='toggle_user_status'),
    path('users/<int:pk>/reset-password/', views.admin_reset_password, name='admin_reset_password'),
    
    # Student endpoints
    path('students/', views.StudentListCreateView.as_view(), name='student_list_create'),
    path('students/bulk-import/', views.bulk_import_students, name='student_bulk_import'),
    path('students/<int:pk>/', views.StudentDetailView.as_view(), name='student_detail'),
    
    # RFID Card endpoints
    path('rfid-cards/', views.RFIDCardListCreateView.as_view(), name='rfid_card_list_create'),
    path('rfid-cards/<int:pk>/', views.RFIDCardDetailView.as_view(), name='rfid_card_detail'),
]
