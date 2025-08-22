from django.db import models
from django.contrib.auth.models import User
import uuid
from django.utils import timezone


# Create your models here.

class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='documents/')
    file_type = models.CharField(max_length=10)
    file_size = models.IntegerField()
    processed = models.BooleanField(default=False)
    vector_store_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        

    def __str__(self):
        return self.title

class QASession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='qa_sessions')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='qa_sessions')
    question = models.TextField()
    answer = models.TextField()
    confidence_score = models.FloatField(null=True, blank=True)
    response_time = models.FloatField(null=True, blank=True)  # in seconds
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Q&A for {self.document.title}"
