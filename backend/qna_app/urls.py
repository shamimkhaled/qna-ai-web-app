from django.urls import path
from .views import (
    RegisterView, LoginView, DocumentUploadView, DocumentListView, 
    DocumentDeleteView, QAView, QAHistoryView, health_check
)

urlpatterns = [
    # Health check
    path('health/', health_check, name='health_check'),
    
    # Authentication
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    
    # Documents
    path('documents/upload/', DocumentUploadView.as_view(), name='document_upload'),
    path('documents/', DocumentListView.as_view(), name='document_list'),
    path('documents/<uuid:document_id>/', DocumentDeleteView.as_view(), name='document_delete'),
    
    # Q&A
    path('qa/ask/', QAView.as_view(), name='qa_ask'),
    path('qa/history/', QAHistoryView.as_view(), name='qa_history'),
]
