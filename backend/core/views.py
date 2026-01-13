from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from .models import SiteSettings
from .serializers import SiteSettingsSerializer

class SiteSettingsView(APIView):
    permission_classes = [permissions.AllowAny] # Allow any to read? Or authenticated? 
    # Let's say allow any to READ (so login page can see title), but only Admin to WRITE.
    parser_classes = (MultiPartParser, FormParser)

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get(self, request):
        settings = SiteSettings.load()
        serializer = SiteSettingsSerializer(settings, context={'request': request})
        return Response(serializer.data)

    def put(self, request):
        settings = SiteSettings.load()
        
        # Check if we should remove the logo
        if request.data.get('remove_logo') == 'true':
            settings.logo.delete(save=False)
            settings.logo = None
            settings.save()
            
        serializer = SiteSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
