# AI-Powered Q&A Web Application

A full-stack web application that allows users to upload documents and ask natural language questions about their content using RAG (Retrieval-Augmented Generation) with OpenAI GPT-4 and LangChain.

## 🚀 Features

- **Document Upload**: Support for .txt, .pdf, .docx files
- **AI-Powered Q&A**: Natural language questions with contextual answers
- **RAG Implementation**: Uses LangChain + ChromaDB for retrieval-augmented generation
- **User Authentication**: JWT-based authentication 
- **Document Management**: Store and manage uploaded documents
- **Q&A History**: Track previous questions and answers
- **Responsive UI**: Clean and intuitive user interface

## 🏗️ Architecture

```
Frontend (React + Tailwind CSS)
    ↓
Backend API (Django REST Framework)
    ↓
AI Processing (LangChain + OpenAI GPT-4)
    ↓
Vector Database (ChromaDB) + PostgreSQL
```

## 📋 Prerequisites

- Python 3.9+
- Node.js 16+
- Docker & Docker Compose
- OpenAI API Key

## 🛠️ Technology Stack

**Backend:**
- Django REST Framework
- LangChain
- OpenAI GPT-4
- ChromaDB (Vector Database)
- PostgreSQL
- JWT Authentication

**Frontend:**
- React 18
- Tailwind CSS
- Axios

**Deployment:**
- Docker
- Docker Compose
- Nginx (Production)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/shamimkhaled/qna-ai-web-app.git
cd qna-ai-web-app
```

### 2. Environment Setup

Create `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
POSTGRES_DB=qa_app_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Django Configuration
SECRET_KEY=your_secret_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# ChromaDB Configuration
CHROMA_PERSIST_DIRECTORY=./chroma_db

# JWT Configuration
JWT_SECRET_KEY=your_jwt_secret_key_here
```

### 3. Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/swagger/

## 📁 Project Structure

```
qna-ai-web-app/
├── backend/
│   ├── qna_project/
│   │   ├── settings.py
│   │   ├── urls.py
|   |   ├── asgi.py
│   │   └── wsgi.py
│   ├── qna_app/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── utils/
│   │       ├── document_processor.py
│   │       └── ai_services.py
│   ├── requirements.txt
|   ├── .env.example
|   ├── .gitignore
│   ├── Dockerfile
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── contexts/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── README.md
```

## 🔧 Development Setup

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Token refresh

### Document Endpoints

- `POST /api/documents/upload/` - Upload document
- `GET /api/documents/` - List user documents
- `DELETE /api/documents/{id}/` - Delete document

### Q&A Endpoints

- `POST /api/qa/ask/` - Ask question about document
- `GET /api/qa/history/` - Get Q&A history



## 🌟 Key Features Implementation

### RAG Pipeline

1. **Document Processing**: Extract text from uploaded files
2. **Text Chunking**: Split documents into manageable chunks
3. **Embedding Generation**: Create vector embeddings using OpenAI
4. **Vector Storage**: Store embeddings in ChromaDB
5. **Retrieval**: Find relevant chunks for user questions
6. **Answer Generation**: Use GPT-4 to generate contextual answers

### Authentication Flow

1. User registers/logs in
2. JWT token issued
3. Token included in API requests
4. Token validated on each request

## 🔒 Security Features

- JWT-based authentication
- Input validation and sanitization
- File type validation
- Rate limiting (production)
- CORS configuration

## 📊 Monitoring & Logging

- Request/response logging
- Error tracking
- Performance monitoring
- Vector database metrics

## 🚀 Deployment

### Production Deployment

1. Update environment variables for production
2. Set `DEBUG=False` in Django settings
3. Configure proper CORS origins
4. Use production-grade database
5. Set up reverse proxy (Nginx)

```bash
# Production build
docker-compose -f docker-compose.prod.yml up --build
```

### Scaling Considerations

- Use Redis for caching
- Implement database connection pooling
- Add load balancer for multiple instances
- Use cloud vector database (Pinecone) for scale
- Implement background job processing (Celery)

## 🐛 Troubleshooting

### Common Issues

1. **OpenAI API Key Error**
   - Ensure valid API key in environment variables
   - Check API quota and billing

2. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials

3. **ChromaDB Issues**
   - Ensure persistent directory permissions
   - Clear ChromaDB data if corrupted

4. **File Upload Issues**
   - Check file size limits
   - Verify supported file formats

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- [LangChain Documentation](https://python.langchain.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)

## 📧 Support

For issues and questions, please open a GitHub issue or contact the development team.

---

**Note**: This application is designed for educational and development purposes. For production use, implement additional security measures and performance optimizations.