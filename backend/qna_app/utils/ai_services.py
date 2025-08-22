import time
import logging
from typing import Dict, List
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from django.conf import settings
from .document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

class AIServices:
    def __init__(self):
        self.llm = ChatOpenAI(
            temperature=0.1,
            model_name="gpt-4",
            openai_api_key=settings.OPENAI_API_KEY
        )
        self.document_processor = DocumentProcessor()
        
        # Custom prompt template
        self.prompt_template = PromptTemplate(
            input_variables=["context", "question"],
            template="""
            You are an AI assistant that answers questions based ONLY on the provided document content.

            Context from the document:
            {context}

            Question: {question}

            Instructions:
            1. Answer ONLY based on the information provided in the context above
            2. If the answer cannot be found in the context, say "I cannot find this information in the provided document"
            3. Be concise but comprehensive in your answer
            4. Quote relevant parts of the document when appropriate
            5. Do not make assumptions or add information not present in the context

            Answer:
        """
        )

    def answer_question(self, document, question: str) -> Dict:
        """Generate answer for a question based on document content."""
        start_time = time.time()
        
        try:
            # Get vector store for the document
            if not document.processed or not document.vector_store_id:
                raise ValueError("Document is not processed yet")
            
            vector_store = self.document_processor.get_vector_store(document.vector_store_id)
            
            # Create retrieval QA chain
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
                chain_type_kwargs={"prompt": self.prompt_template},
                return_source_documents=True
            )
            
            # Get answer
            result = qa_chain({"query": question})
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Calculate confidence score based on source similarity
            confidence_score = self._calculate_confidence_score(result.get('source_documents', []))
            
            response = {
                "answer": result['result'],
                "confidence_score": confidence_score,
                "response_time": response_time,
                "source_count": len(result.get('source_documents', []))
            }
            
            logger.info(f"Question answered successfully in {response_time:.2f} seconds")
            return response
            
        except Exception as e:
            logger.error(f"Error answering question: {str(e)}")
            raise

    def _calculate_confidence_score(self, source_documents: List) -> float:
        """Calculate confidence score based on retrieved documents."""
        if not source_documents:
            return 0.0
        
        # Simple confidence calculation based on number of sources and content length
        avg_content_length = sum(len(doc.page_content) for doc in source_documents) / len(source_documents)
        
        # Normalize score between 0.1 and 1.0
        confidence = min(0.1 + (len(source_documents) * 0.15) + (avg_content_length / 2000) * 0.3, 1.0)
        
        return round(confidence, 2)