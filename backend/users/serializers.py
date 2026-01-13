"""
User serializers for EDURFID system.
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, School, Student, RFIDCard


class SchoolSerializer(serializers.ModelSerializer):
    """Serializer for School model."""
    
    class Meta:
        model = School
        fields = ['id', 'name', 'location', 'connectivity_status', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    school_name = serializers.CharField(source='school.name', read_only=True)
    get_full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'get_full_name',
            'role', 'school', 'school_name', 'phone_number', 
            'is_offline_sync_enabled', 'last_sync', 'is_active', 'password'
        ]
        read_only_fields = ['id', 'last_sync']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}
    
    def get_get_full_name(self, obj):
        """Return full name of the user."""
        return obj.get_full_name() if obj.get_full_name() else obj.username

    def update(self, instance, validated_data):
        import logging
        logger = logging.getLogger('edurfid')
        logger.info(f"DEBUG: UserSerializer.update called for user: {instance.username}")
        logger.info(f"DEBUG: validated_data keys: {list(validated_data.keys())}")
        password = validated_data.pop('password', None)
        if password:
            logger.info(f"DEBUG: Password found in validated_data for {instance.username}")
        
        user = super().update(instance, validated_data)
        
        if password:
            user.set_password(password)
            user.save()
            logger.info(f"DEBUG: Password updated successfully for {instance.username}")
            
        return user


class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model."""
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    rfid_cards = serializers.SerializerMethodField()
    face_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Student
        fields = [
            'id', 'user', 'student_id', 'grade', 'parent_contact', 
            'parent_email', 'date_of_birth', 'address', 'enrollment_date', 
            'is_active', 'full_name', 'rfid_cards', 'face_image', 'face_image_url',
            'is_face_enrolled', 'face_enrolled_at', 'face_images_count'
        ]
        read_only_fields = ['id', 'enrollment_date', 'face_enrolled_at']

    def get_full_name(self, obj):
        return obj.user.get_full_name()

    def get_rfid_cards(self, obj):
        active_cards = obj.rfid_cards.filter(status='active')
        return RFIDCardSerializer(active_cards, many=True).data
    
    def get_face_image_url(self, obj):
        """Get URL for face image."""
        if obj.face_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.face_image.url)
            return obj.face_image.url
        return None


class RFIDCardSerializer(serializers.ModelSerializer):
    """Serializer for RFIDCard model."""
    student_name = serializers.CharField(source='student.user.get_full_name', read_only=True)
    
    class Meta:
        model = RFIDCard
        fields = [
            'id', 'card_id', 'student', 'student_name', 'status', 
            'issued_date', 'last_used', 'notes'
        ]
        read_only_fields = ['id', 'issued_date']


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include username and password.')


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name', 
            'role', 'school', 'phone_number', 'password', 'password_confirm'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class StudentRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for student registration with user creation."""
    user = serializers.DictField(write_only=True, required=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    parent_email = serializers.EmailField(required=False, allow_blank=True)
    
    class Meta:
        model = Student
        fields = [
            'user', 'student_id', 'grade', 'parent_contact', 
            'parent_email', 'date_of_birth', 'address'
        ]

    def validate_student_id(self, value):
        """Validate that student_id is unique."""
        if Student.objects.filter(student_id=value).exists():
            raise serializers.ValidationError(f"Student with ID '{value}' already exists.")
        return value

    def validate_date_of_birth(self, value):
        """Handle empty string for date_of_birth."""
        if value == '' or value is None:
            return None
        return value



    def validate_user(self, value):
        """Validate user data."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("User data must be an object.")
        
        if not value.get('first_name'):
            raise serializers.ValidationError("First name is required.")
        
        if not value.get('last_name'):
            raise serializers.ValidationError("Last name is required.")
        
        # Auto-generate username if not provided
        if not value.get('username'):
            first_name = value.get('first_name', '').lower().replace(' ', '')
            last_name = value.get('last_name', '').lower().replace(' ', '')
            base_username = f"{first_name}.{last_name}"
            username = base_username
            counter = 1
            # Ensure username is unique
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            value['username'] = username
        
        # Check if username already exists
        username = value.get('username')
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError(f"Username '{username}' already exists.")
        
        return value

    def to_internal_value(self, data):
        """Convert empty strings to None for optional date/email fields."""
        # Create a copy to avoid modifying the original
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        
        # Handle date_of_birth empty string - convert to None
        if 'date_of_birth' in data:
            if data['date_of_birth'] == '' or data['date_of_birth'] is None:
                data['date_of_birth'] = None
            elif isinstance(data['date_of_birth'], str) and data['date_of_birth'].strip() == '':
                data['date_of_birth'] = None
        
        # Handle parent_email empty string
        if 'parent_email' in data:
            if data['parent_email'] is None:
                 data['parent_email'] = ''
            elif isinstance(data['parent_email'], str) and data['parent_email'].strip() == '':
                 data['parent_email'] = ''
        
        # Handle parent_contact empty string - keep as empty string (CharField allows blank)
        if 'parent_contact' in data and data['parent_contact'] == '':
            data['parent_contact'] = ''
        
        # Handle address empty string - keep as empty string (TextField allows blank)
        if 'address' in data and data['address'] == '':
            data['address'] = ''
        
        return super().to_internal_value(data)

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        
        # Extract user fields
        username = user_data.get('username')
        email = user_data.get('email', '')
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')
        phone_number = user_data.get('phone_number', '')
        
        # Generate password if not provided (use 'student123' as default)
        password = user_data.get('password') or 'student123'
        
        # Generate email if not provided
        if not email:
            email = f"{username}@school.local"
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role='student',
            password=password
        )
        
        # Clean validated_data - convert empty strings to None for optional fields
        if 'date_of_birth' in validated_data and validated_data['date_of_birth'] == '':
            validated_data['date_of_birth'] = None
        if 'parent_email' in validated_data and validated_data['parent_email'] == None:
             validated_data['parent_email'] = ''
        
        # Create student
        student = Student.objects.create(user=user, **validated_data)
        return student


class StudentUpdateSerializer(StudentSerializer):
    """Serializer for updating student details including nested user data."""
    user = serializers.DictField(required=False)
    
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        
        # Update student fields
        instance = super().update(instance, validated_data)
        
        # Update user fields if provided
        if user_data:
            user = instance.user
            for key, value in user_data.items():
                # Allow updating specific user fields
                if key in ['first_name', 'last_name', 'email', 'phone_number']:
                    setattr(user, key, value)
                elif key == 'password' and value:
                    user.set_password(value)
            user.save()
            
        return instance
