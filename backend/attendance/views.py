"""
Attendance views for EDURFID system.
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Q, Avg, Case, When, Value, FloatField
from django.db import transaction
from datetime import datetime, timedelta
from .models import AttendanceRecord, AttendanceSummary, AttendanceAlert, RFIDScan
from .serializers import (
    AttendanceRecordSerializer, AttendanceSummarySerializer, 
    AttendanceAlertSerializer, RFIDScanSerializer, DailyAttendanceSerializer,
    AttendanceStatsSerializer, StudentAttendanceHistorySerializer
)
from users.models import Student, RFIDCard


class AttendanceRecordListCreateView(generics.ListCreateAPIView):
    """List and create attendance records."""
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['date', 'status', 'student__grade']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__student_id']
    ordering_fields = ['date', 'timestamp']
    ordering = ['-date', '-timestamp']

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class AttendanceRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete an attendance record."""
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class AttendanceSummaryListView(generics.ListAPIView):
    """List attendance summaries."""
    queryset = AttendanceSummary.objects.all()
    serializer_class = AttendanceSummarySerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-date']


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attendance_alerts(request):
    """Get active attendance alerts."""
    alerts = AttendanceAlert.objects.filter(is_resolved=False)
    
    # Filter by school if not superuser
    if not request.user.is_superuser and hasattr(request.user, 'school') and request.user.school:
        alerts = alerts.filter(student__user__school=request.user.school)
        
    # If student, show only their alerts
    if request.user.role == 'student':
        try:
            alerts = alerts.filter(student=request.user.student_profile)
        except Exception:
            alerts = alerts.none()
            
    serializer = AttendanceAlertSerializer(alerts.order_by('-created_at')[:10], many=True)
    return Response(serializer.data)


class RFIDScanListView(generics.ListCreateAPIView):
    """List and create RFID scans."""
    queryset = RFIDScan.objects.all()
    serializer_class = RFIDScanSerializer
    permission_classes = [IsAuthenticated]
    ordering = ['-scan_timestamp']


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_attendance_from_rfid(request):
    """Record attendance from RFID scan."""
    try:
        card_id = request.data.get('card_id')
        if not card_id:
            return Response({'error': 'Card ID is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Create RFID scan record
        rfid_scan = RFIDScan.objects.create(card_id=card_id)

        # Find student by RFID card
        try:
            rfid_card = RFIDCard.objects.get(card_id=card_id, status='active')
            student = rfid_card.student
            rfid_scan.student = student
            rfid_scan.save()

            # Update card last used
            rfid_card.update_last_used()

            # Check if attendance already recorded for today
            today = timezone.now().date()
            existing_record = AttendanceRecord.objects.filter(
                student=student, date=today
            ).first()

            if existing_record:
                return Response({
                    'message': f'Attendance already recorded for {student.user.get_full_name()}',
                    'student': student.user.get_full_name(),
                    'status': existing_record.status,
                    'timestamp': existing_record.timestamp
                }, status=status.HTTP_200_OK)

            # Create attendance record
            with transaction.atomic():
                attendance_record = AttendanceRecord.objects.create(
                    student=student,
                    date=today,
                    status='present',
                    recorded_by=request.user
                )
                
                # Update daily summary
                update_daily_summary(today)

                rfid_scan.mark_as_processed()

                return Response({
                    'message': f'Attendance recorded for {student.user.get_full_name()}',
                    'student': student.user.get_full_name(),
                    'grade': student.grade,
                    'status': 'present',
                    'timestamp': attendance_record.timestamp
                }, status=status.HTTP_201_CREATED)

        except RFIDCard.DoesNotExist:
            rfid_scan.error_message = f'No active RFID card found with ID: {card_id}'
            rfid_scan.mark_as_processed()
            return Response({
                'error': f'No active RFID card found with ID: {card_id}'
            }, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_attendance(request):
    """Get daily attendance data."""
    date_str = request.query_params.get('date')
    if date_str:
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        date = timezone.now().date()

    # Get attendance records for the date
    attendance_records = AttendanceRecord.objects.filter(date=date)

    # If the user is a student, they should only see their own attendance
    is_student = request.user.role == 'student'
    student_obj = None
    if is_student:
        try:
            student_obj = request.user.student_profile
            # For a student, we only want their specific record for today
            attendance_records = attendance_records.filter(student=student_obj)
        except Exception:
            # Handle if user is student but has no profile
            return Response({'error': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)

    # Calculate summary
    if is_student:
        total_students = 1
    else:
        total_students = Student.objects.filter(is_active=True).count()
        
    present_count = attendance_records.filter(status='present').count()
    absent_count = attendance_records.filter(status='absent').count()
    late_count = attendance_records.filter(status='late').count()
    excused_count = attendance_records.filter(status='excused').count()
    
    attendance_percentage = 0
    if total_students > 0:
        present_total = present_count + late_count + excused_count
        attendance_percentage = (present_total / total_students) * 100

    data = {
        'date': date,
        'total_students': total_students,
        'present_count': present_count,
        'absent_count': absent_count,
        'late_count': late_count,
        'excused_count': excused_count,
        'attendance_percentage': round(attendance_percentage, 2),
        'students': AttendanceRecordSerializer(attendance_records, many=True, context={'request': request}).data
    }

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attendance_stats(request):
    """Get attendance statistics."""
    period = request.query_params.get('period', 'week')  # week, month, year
    
    if period == 'week':
        start_date = timezone.now().date() - timedelta(days=7)
    elif period == 'month':
        start_date = timezone.now().date() - timedelta(days=30)
    elif period == 'year':
        start_date = timezone.now().date() - timedelta(days=365)
    else:
        start_date = timezone.now().date() - timedelta(days=7)

    # Get attendance records for the period
    attendance_records = AttendanceRecord.objects.filter(date__gte=start_date)
    summaries = AttendanceSummary.objects.filter(date__gte=start_date)

    # If the user is a student, calculate their personal stats
    is_student = request.user.role == 'student'
    if is_student:
        try:
            student_obj = request.user.student_profile
            # Dennominator should be total school days tracked
            total_days = summaries.count()
            
            # Student records for this period
            student_records = attendance_records.filter(student=student_obj)
            
            present_total = student_records.filter(Q(status='present') | Q(status='late') | Q(status='excused')).count()
            avg_attendance = (present_total / total_days * 100) if total_days > 0 else 0
            
            best_day = None
            worst_day = None
            
            # Personal trends: group their records by date
            # Since a student has at most one record per day, we can just use the status
            trends = student_records.values('date').annotate(
                rate=Case(
                    When(status='present', then=Value(100.0)),
                    When(status='late', then=Value(100.0)),
                    When(status='excused', then=Value(100.0)),
                    default=Value(0.0),
                    output_field=FloatField(),
                )
            ).order_by('date')
            
            # Re-filter attendance_records for the rest of calculations
            attendance_records = student_records
            
        except Exception as e:
            import logging
            logger = logging.getLogger('edurfid')
            logger.error(f"Error calculating student stats: {e}")
            return Response({'error': 'Student profile not found or error calculating stats'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Calculate global statistics
        total_days = summaries.count()
        if total_days > 0:
            avg_attendance = summaries.aggregate(avg=Avg('attendance_percentage'))['avg'] or 0
            best_day = summaries.order_by('-attendance_percentage').first()
            worst_day = summaries.order_by('attendance_percentage').first()
            best_day = best_day.date if best_day else None
            worst_day = worst_day.date if worst_day else None
        else:
            avg_attendance = 0
            best_day = None
            worst_day = None
            
        trends = summaries.values('date').annotate(
            rate=Avg('attendance_percentage')
        ).order_by('date')

    total_present = attendance_records.filter(status='present').count()
    total_absent = attendance_records.filter(status='absent').count()
    total_late = attendance_records.filter(status='late').count()
    total_excused = attendance_records.filter(status='excused').count()

    data = {
        'period': period,
        'total_days': total_days,
        'average_attendance': round(avg_attendance or 0, 2),
        'best_day': best_day,
        'worst_day': worst_day,
        'total_present': total_present,
        'total_absent': total_absent,
        'total_late': total_late,
        'total_excused': total_excused,
        'trends': list(trends)
    }

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_attendance_history(request, student_id):
    """Get attendance history for a specific student."""
    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get recent attendance records (last 30 days)
    recent_records = AttendanceRecord.objects.filter(
        student=student,
        date__gte=timezone.now().date() - timedelta(days=30)
    ).order_by('-date')[:10]

    # Calculate totals
    total_days = AttendanceRecord.objects.filter(student=student).count()
    present_days = AttendanceRecord.objects.filter(student=student, status='present').count()
    absent_days = AttendanceRecord.objects.filter(student=student, status='absent').count()
    late_days = AttendanceRecord.objects.filter(student=student, status='late').count()
    excused_days = AttendanceRecord.objects.filter(student=student, status='excused').count()

    attendance_percentage = 0
    if total_days > 0:
        present_total = present_days + late_days + excused_days
        attendance_percentage = (present_total / total_days) * 100

    data = {
        'student': student,
        'total_days': total_days,
        'present_days': present_days,
        'absent_days': absent_days,
        'late_days': late_days,
        'excused_days': excused_days,
        'attendance_percentage': round(attendance_percentage, 2),
        'recent_records': recent_records
    }

    serializer = StudentAttendanceHistorySerializer(data, context={'request': request})
    return Response(serializer.data)


def update_daily_summary(date):
    """Update or create daily attendance summary."""
    attendance_records = AttendanceRecord.objects.filter(date=date)
    total_students = Student.objects.filter(is_active=True).count()
    
    present_count = attendance_records.filter(status='present').count()
    absent_count = attendance_records.filter(status='absent').count()
    late_count = attendance_records.filter(status='late').count()
    excused_count = attendance_records.filter(status='excused').count()

    summary, created = AttendanceSummary.objects.get_or_create(
        date=date,
        defaults={
            'total_students': total_students,
            'present_count': present_count,
            'absent_count': absent_count,
            'late_count': late_count,
            'excused_count': excused_count,
        }
    )

    if not created:
        summary.total_students = total_students
        summary.present_count = present_count
        summary.absent_count = absent_count
        summary.late_count = late_count
        summary.excused_count = excused_count
        summary.save()
