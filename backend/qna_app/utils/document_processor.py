import os
import logging
from typing import List, Tuple
import PyPDF2
from docx import Document as DocxDocument
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from django.conf import settings

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    def extract_text_from_file(self, file_path: str, file_type: str) -> str:
        """Extract text from different file types."""
        try:
            if file_type == 'txt':
                return self._extract_from_txt(file_path)
            elif file_type == 'pdf':
                return self._extract_from_pdf(file_path)
            elif file_type == 'docx':
                return self._extract_from_docx(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            raise

    def _extract_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file."""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()

    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file."""
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        return text

    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = DocxDocument(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text

    def process_document(self, document_instance) -> str:
        """Process document and create vector store."""
        try:
            # Extract text from file
            file_path = document_instance.file.path
            text = self.extract_text_from_file(file_path, document_instance.file_type)
            
            if not text.strip():
                raise ValueError("No text found in the document")

            # Split text into chunks
            chunks = self.text_splitter.split_text(text)
            
            # Create vector store
            vector_store_id = f"doc_{document_instance.id}"
            persist_directory = os.path.join(settings.CHROMA_PERSIST_DIRECTORY, vector_store_id)
            
            # Create ChromaDB collection
            vector_store = Chroma.from_texts(
                texts=chunks,
                embedding=self.embeddings,
                persist_directory=persist_directory,
                collection_name=vector_store_id
            )
            
            # Update document instance
            document_instance.vector_store_id = vector_store_id
            document_instance.processed = True
            document_instance.save()
            
            logger.info(f"Document {document_instance.id} processed successfully")
            return vector_store_id
            
        except Exception as e:
            logger.error(f"Error processing document {document_instance.id}: {str(e)}")
            raise

    def get_vector_store(self, vector_store_id: str):
        """Get existing vector store."""
        try:
            persist_directory = os.path.join(settings.CHROMA_PERSIST_DIRECTORY, vector_store_id)
            
            return Chroma(
                persist_directory=persist_directory,
                embedding_function=self.embeddings,
                collection_name=vector_store_id
            )
        except Exception as e:
            logger.error(f"Error loading vector store {vector_store_id}: {str(e)}")
            raise