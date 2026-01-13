"""
User views for EDURFID system.
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from .models import User, School, Student, RFIDCard
from .serializers import (
    UserSerializer, SchoolSerializer, StudentSerializer, 
    RFIDCardSerializer, LoginSerializer, RegisterSerializer,
    RFIDCardSerializer, LoginSerializer, RegisterSerializer,
    StudentRegistrationSerializer, StudentUpdateSerializer
)
import csv
import io
import pandas as pd
from django.db import transaction
from django.contrib.auth.hashers import make_password


class SchoolListCreateView(generics.ListCreateAPIView):
    """List and create schools."""
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAuthenticated]  # Only admin can create schools
        return [permission() for permission in permission_classes]


class UserListCreateView(generics.ListCreateAPIView):
    """List and create users."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Allow admins to see all users, others might be restricted (or just see all for now)
        return User.objects.all()

class UserDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a user."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

@api_view(['PUT'])
@permission_classes([permissions.IsAdminUser])
def admin_update_user(request, pk):
    """Admin update user details."""
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def toggle_user_status(request, pk):
    """Toggle user active status."""
    try:
        user = User.objects.get(pk=pk)
        # Prevent deactivating self
        if user == request.user:
             return Response({'error': 'Cannot deactivate your own account'}, status=status.HTTP_400_BAD_REQUEST)
             
        user.is_active = not user.is_active
        user.save()
        status_text = "activated" if user.is_active else "deactivated"
        return Response({
            'status': 'success',
            'message': f'User {user.username} has been {status_text}',
            'is_active': user.is_active
        })
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def admin_reset_password(request, pk):
    """Admin reset user password."""
    try:
        user = User.objects.get(pk=pk)
        password = request.data.get('password')
        if not password or len(password) < 6:
            return Response({'error': 'Password must be at least 6 characters'}, status=status.HTTP_400_BAD_REQUEST)
            
        user.set_password(password)
        user.save()
        return Response({'status': 'success', 'message': 'Password updated successfully'})
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class StudentListCreateView(generics.ListCreateAPIView):
    """List and create students."""
    """List and create students."""
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Student.objects.filter(is_active=True)
        grade = self.request.query_params.get('grade')
        search = self.request.query_params.get('search')
        
        if grade:
            queryset = queryset.filter(grade=grade)
            
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) | 
                Q(user__last_name__icontains=search) |
                Q(student_id__icontains=search)
            )
            
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StudentRegistrationSerializer
        return StudentSerializer

    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        """Override create to provide better error messages."""
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating student: {e}", exc_info=True)
            if hasattr(serializer, 'errors') and serializer.errors:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {'error': f'Failed to create student: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class StudentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete a student."""
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return StudentUpdateSerializer
        return StudentSerializer

    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class RFIDCardListCreateView(generics.ListCreateAPIView):
    """List and create RFID cards."""
    queryset = RFIDCard.objects.all()
    serializer_class = RFIDCardSerializer
    permission_classes = [IsAuthenticated]


class RFIDCardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update or delete an RFID card."""
    queryset = RFIDCard.objects.all()
    serializer_class = RFIDCardSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """User login endpoint."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """User registration endpoint."""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Get current user profile."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """Update current user profile."""
    import logging
    logger = logging.getLogger('edurfid')
    logger.info(f"DEBUG: update_profile_view called for user: {request.user.username}")
    logger.info(f"DEBUG: request data: {request.data}")
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        logger.info(f"DEBUG: Serializer is valid. Validated data: {serializer.validated_data}")
        serializer.save()
        logger.info(f"DEBUG: Serializer saved successfully")
        return Response(serializer.data)
    logger.info(f"DEBUG: Serializer invalid: {serializer.errors}")
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """User logout endpoint."""
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception as e:
        return Response(status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def bulk_import_students(request):
    """
    Bulk import students from CSV or Excel file.
    Expected columns: student_id, first_name, last_name, grade, parent_email, parent_contact
    """
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Determine file type and read
        if file.name.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.name.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return Response({'error': 'Invalid file format. Please upload .csv or .xlsx'}, status=status.HTTP_400_BAD_REQUEST)

        # Standardize headers
        df.columns = [c.lower().replace(' ', '_') for c in df.columns]
        
        required_cols = ['student_id', 'first_name', 'last_name', 'grade']
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            return Response({'error': f'Missing required columns: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)

        success_count = 0
        errors = []

        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    student_id = str(row['student_id']).strip()
                    first_name = str(row['first_name']).strip()
                    last_name = str(row['last_name']).strip()
                    grade = str(row['grade']).strip()
                    
                    # Optional fields
                    parent_email = str(row.get('parent_email', '')).strip()
                    parent_contact = str(row.get('parent_contact', '')).strip()
                    if parent_email == 'nan': parent_email = ''
                    if parent_contact == 'nan': parent_contact = ''

                    # Check if student exists
                    if Student.objects.filter(student_id=student_id).exists():
                        errors.append(f"Row {index+2}: Student ID {student_id} already exists")
                        continue

                    # Create User
                    username = student_id  # Default username is student ID
                    if User.objects.filter(username=username).exists():
                         # Try appending 1 or logic, but for now just error
                         username = f"{student_id}_{first_name}"
                    
                    user = User.objects.create(
                        username=username,
                        email=parent_email,
                        first_name=first_name,
                        last_name=last_name,
                        password=make_password('student123') # Default password
                    )

                    # Create Student
                    Student.objects.create(
                        user=user,
                        student_id=student_id,
                        grade=grade,
                        parent_email=parent_email,
                        parent_contact=parent_contact
                    )
                    success_count += 1

                except Exception as e:
                    errors.append(f"Row {index+2}: {str(e)}")

        return Response({
            'status': 'success',
            'imported': success_count,
            'errors': errors
        })

    except Exception as e:
        return Response({'error': f"Processing failed: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
