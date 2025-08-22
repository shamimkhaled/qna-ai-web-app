from django.contrib import admin
from .models import Document, QASession

# Register your models here.

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'file_type', 'file_size', 'processed', 'created_at']
    list_filter = ['file_type', 'processed', 'created_at']
    search_fields = ['title', 'user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']

@admin.register(QASession)
class QASessionAdmin(admin.ModelAdmin):
    list_display = ['document', 'user', 'question_preview', 'confidence_score', 'created_at']
    list_filter = ['confidence_score', 'created_at']
    search_fields = ['question', 'answer', 'document__title', 'user__username']
    readonly_fields = ['id', 'created_at']
    
    def question_preview(self, obj):
        return obj.question[:50] + "..." if len(obj.question) > 50 else obj.question
    question_preview.short_description = "Question"