# EDURFID Complete Project Setup Script
Write-Host "========================================" -ForegroundColor Green
Write-Host "   EDURFID Complete Project Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Creating migrations for custom apps..." -ForegroundColor Yellow
python manage.py makemigrations users
python manage.py makemigrations attendance

Write-Host ""
Write-Host "Step 2: Running all migrations..." -ForegroundColor Yellow
python manage.py migrate

Write-Host ""
Write-Host "Step 3: Creating admin superuser..." -ForegroundColor Yellow
$createAdminScript = @"
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@edurfid.com', 'admin123')
    print('Admin user created successfully')
else:
    print('Admin user already exists')
"@
echo $createAdminScript | python manage.py shell

Write-Host ""
Write-Host "Step 4: Creating sample data..." -ForegroundColor Yellow
$sampleDataScript = @"
from users.models import School, User
from attendance.models import Student, RFIDCard

# Create sample school if it doesn't exist
school, created = School.objects.get_or_create(
    name='Escuela Rural San Juan',
    defaults={
        'address': 'Carretera Principal Km 45, San Juan, Peru',
        'phone': '+51 987654321',
        'email': 'contacto@escuelasanjuan.edu.pe',
        'is_active': True
    }
)
print(f'School created: {created}')

# Create sample students
students_data = [
    {'first_name': 'Maria', 'last_name': 'Gonzalez', 'student_id': 'STU001', 'grade': '6', 'section': 'A'},
    {'first_name': 'Carlos', 'last_name': 'Rodriguez', 'student_id': 'STU002', 'grade': '6', 'section': 'A'},
    {'first_name': 'Ana', 'last_name': 'Martinez', 'student_id': 'STU003', 'grade': '7', 'section': 'B'},
    {'first_name': 'Luis', 'last_name': 'Lopez', 'student_id': 'STU004', 'grade': '7', 'section': 'B'},
    {'first_name': 'Sofia', 'last_name': 'Perez', 'student_id': 'STU005', 'grade': '8', 'section': 'A'},
]

for student_data in students_data:
    student, created = Student.objects.get_or_create(
        student_id=student_data['student_id'],
        defaults={
            'first_name': student_data['first_name'],
            'last_name': student_data['last_name'],
            'grade': student_data['grade'],
            'section': student_data['section'],
            'school': school,
            'is_active': True
        }
    )
    print(f'Student {student_data["student_id"]} created: {created}')
    
    # Create RFID card for each student
    rfid_card, created = RFIDCard.objects.get_or_create(
        student=student,
        defaults={
            'card_number': f'RFID{student_data["student_id"]}',
            'is_active': True
        }
    )
    print(f'RFID card for {student_data["student_id"]} created: {created}')

print('Sample data creation completed!')
"@
echo $sampleDataScript | python manage.py shell

Write-Host ""
Write-Host "Step 5: Collecting static files..." -ForegroundColor Yellow
python manage.py collectstatic --noinput

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Setup Complete! Starting Server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Admin Panel: http://localhost:8000/admin" -ForegroundColor Cyan
Write-Host "API Documentation: http://localhost:8000/api/docs/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Yellow
Write-Host "Username: admin" -ForegroundColor White
Write-Host "Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

python manage.py runserver 0.0.0.0:8000
