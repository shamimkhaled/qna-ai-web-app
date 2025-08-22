from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Document, QASession

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined')

class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ('file', 'title')

    def validate_file(self, value):
        # Check file size (50MB max)
        if value.size > 50 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 50MB")
        
        # Check file extension
        allowed_extensions = ['.txt', '.pdf', '.docx']
        file_extension = '.' + value.name.split('.')[-1].lower()
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type not supported. Allowed types: {', '.join(allowed_extensions)}"
            )
        
        return value

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ('id', 'title', 'file_type', 'file_size', 'processed', 'created_at', 'updated_at')

class QARequestSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    question = serializers.CharField(max_length=1000)

class QAResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QASession
        fields = ('id', 'question', 'answer', 'confidence_score', 'response_time', 'created_at')

class QAHistorySerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)

    class Meta:
        model = QASession
        fields = ('id', 'document_title', 'question', 'answer', 'confidence_score', 'created_at')