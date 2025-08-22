import logging
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from .models import Document, QASession
from .serializers import (
    UserRegistrationSerializer, UserSerializer, DocumentUploadSerializer,
    DocumentSerializer, QARequestSerializer, QAResponseSerializer, QAHistorySerializer
)
from .utils.document_processor import DocumentProcessor
from .utils.ai_services import AIServices
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

logger = logging.getLogger(__name__)

# Create your views here.



# Authentication Views
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        request_body=UserRegistrationSerializer,
        responses={201: UserSerializer}
    )
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'username': openapi.Schema(type=openapi.TYPE_STRING),
                'password': openapi.Schema(type=openapi.TYPE_STRING),
            }
        ),
        responses={200: 'Success'}
    )
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                })
        
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )

# Document Views
class DocumentUploadView(APIView):
    
    @swagger_auto_schema(
        request_body=DocumentUploadSerializer,
        responses={201: DocumentSerializer}
    )
    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        if serializer.is_valid():
            # Get file info
            file = serializer.validated_data['file']
            title = serializer.validated_data.get('title', file.name)
            
            # Create document instance
            document = Document.objects.create(
                user=request.user,
                title=title,
                file=file,
                file_type=file.name.split('.')[-1].lower(),
                file_size=file.size
            )
            
            try:
                # Process document in background (or synchronously for simplicity)
                processor = DocumentProcessor()
                processor.process_document(document)
                
                return Response(
                    DocumentSerializer(document).data, 
                    status=status.HTTP_201_CREATED
                )
                
            except Exception as e:
                # Clean up if processing fails
                document.delete()
                logger.error(f"Document processing failed: {str(e)}")
                return Response(
                    {'error': 'Failed to process document'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DocumentListView(ListAPIView):
    serializer_class = DocumentSerializer
    
    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

class DocumentDeleteView(APIView):
    
    @swagger_auto_schema(
        responses={204: 'Document deleted successfully'}
    )
    def delete(self, request, document_id):
        document = get_object_or_404(Document, id=document_id, user=request.user)
        
        try:
            # Clean up vector store files if they exist
            import shutil
            import os
            from django.conf import settings
            
            if document.vector_store_id:
                vector_store_path = os.path.join(
                    settings.CHROMA_PERSIST_DIRECTORY, 
                    document.vector_store_id
                )
                if os.path.exists(vector_store_path):
                    shutil.rmtree(vector_store_path)
            
            document.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Error deleting document: {str(e)}")
            return Response(
                {'error': 'Failed to delete document'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Q&A Views
class QAView(APIView):
    
    @swagger_auto_schema(
        request_body=QARequestSerializer,
        responses={200: QAResponseSerializer}
    )
    def post(self, request):
        serializer = QARequestSerializer(data=request.data)
        if serializer.is_valid():
            document_id = serializer.validated_data['document_id']
            question = serializer.validated_data['question']
            
            # Get document
            document = get_object_or_404(
                Document, 
                id=document_id, 
                user=request.user,
                processed=True
            )
            
            try:
                # Generate answer using AI
                ai_service = AIServices()
                result = ai_service.answer_question(document, question)
                
                # Save Q&A session
                qa_session = QASession.objects.create(
                    user=request.user,
                    document=document,
                    question=question,
                    answer=result['answer'],
                    confidence_score=result['confidence_score'],
                    response_time=result['response_time']
                )
                
                return Response(QAResponseSerializer(qa_session).data)
                
            except Exception as e:
                logger.error(f"Error generating answer: {str(e)}")
                return Response(
                    {'error': 'Failed to generate answer'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class QAHistoryView(ListAPIView):
    serializer_class = QAHistorySerializer
    
    def get_queryset(self):
        document_id = self.request.query_params.get('document_id')
        queryset = QASession.objects.filter(user=self.request.user)
        
        if document_id:
            queryset = queryset.filter(document_id=document_id)
            
        return queryset

# Health Check View
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    return Response({'status': 'healthy'})