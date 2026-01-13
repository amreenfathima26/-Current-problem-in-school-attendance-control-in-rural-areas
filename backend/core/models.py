from django.db import models

class SiteSettings(models.Model):
    site_name = models.CharField(max_length=100, default="EDURFID")
    site_caption = models.CharField(max_length=200, default="School Sync")
    logo = models.ImageField(upload_to='site_branding/', null=True, blank=True)
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super(SiteSettings, self).save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Site Settings"
