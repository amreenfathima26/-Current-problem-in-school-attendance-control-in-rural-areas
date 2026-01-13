from django.urls import path
from . import views

urlpatterns = [
    path('daily/<str:date>/', views.generate_daily_report, name='daily-report'),
    path('monthly/<int:year>/<str:month>/', views.generate_monthly_report, name='monthly-report'),
    path('student/<str:student_id>/', views.generate_student_report, name='student-report'),
    path('export/excel/', views.export_attendance_excel, name='export-excel'),
]
