import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Send, 
  Paperclip, 
  FileText, 
  User, 
  Bot, 
  LogOut,
  Trash2,
  Plus,
  MessageSquare,
  File,
  AlertCircle,
  CheckCircle2,
  Upload
} from 'lucide-react';
import api from '../services/api';

export default function ChatInterface() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Supported file types
  const SUPPORTED_TYPES = {
    'application/pdf': { ext: 'PDF', icon: '📄', color: 'text-red-600' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'DOCX', icon: '📘', color: 'text-blue-600' },
    'application/msword': { ext: 'DOC', icon: '📘', color: 'text-blue-600' },
    'text/plain': { ext: 'TXT', icon: '📝', color: 'text-gray-600' }
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedDocument) {
      fetchQAHistory();
    }
  }, [selectedDocument]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents/');
      const docs = response.data.results || response.data;
      setDocuments(docs);
      
      // Auto-select first document if available
      if (docs.length > 0 && !selectedDocument) {
        setSelectedDocument(docs[0]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchQAHistory = async () => {
    if (!selectedDocument) return;
    
    try {
      const response = await api.get(`/qa/history/?document_id=${selectedDocument.id}`);
      const history = response.data.results || response.data;
      
      // Convert history to messages format
      const historyMessages = history.reverse().flatMap(qa => [
        {
          id: `q-${qa.id}`,
          type: 'user',
          content: qa.question,
          timestamp: qa.created_at
        },
        {
          id: `a-${qa.id}`,
          type: 'assistant',
          content: qa.answer,
          confidence: qa.confidence_score,
          timestamp: qa.created_at
        }
      ]);
      
      setMessages(historyMessages);
    } catch (error) {
      console.error('Error fetching Q&A history:', error);
    }
  };

  // Get file extension from filename
  const getFileExtension = (filename) => {
    return filename.split('.').pop().toUpperCase();
  };

  // Get file type info
  const getFileTypeInfo = (file) => {
    const extension = getFileExtension(file.name);
    
    // Check by MIME type first
    if (SUPPORTED_TYPES[file.type]) {
      return { ...SUPPORTED_TYPES[file.type], ext: extension };
    }
    
    // Fallback to extension
    switch (extension.toLowerCase()) {
      case 'pdf':
        return { ext: 'PDF', icon: '📄', color: 'text-red-600' };
      case 'docx':
        return { ext: 'DOCX', icon: '📘', color: 'text-blue-600' };
      case 'doc':
        return { ext: 'DOC', icon: '📘', color: 'text-blue-600' };
      case 'txt':
        return { ext: 'TXT', icon: '📝', color: 'text-gray-600' };
      default:
        return { ext: extension, icon: '📁', color: 'text-gray-500' };
    }
  };

  // Validate file
  const validateFile = (file) => {
    const errors = [];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size (${formatFileSize(file.size)}) exceeds 50MB limit`);
    }
    
    // Check file type
    const extension = getFileExtension(file.name).toLowerCase();
    const supportedExtensions = ['pdf', 'docx', 'doc', 'txt'];
    const isSupportedType = Object.keys(SUPPORTED_TYPES).includes(file.type);
    const isSupportedExtension = supportedExtensions.includes(extension);
    
    if (!isSupportedType && !isSupportedExtension) {
      errors.push(`File type "${extension}" is not supported. Please use PDF, DOCX, DOC, or TXT files.`);
    }
    
    // Check if file has content
    if (file.size === 0) {
      errors.push('File appears to be empty');
    }
    
    return errors;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedDocument || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/qa/ask/', {
        document_id: selectedDocument.id,
        question: userMessage.content
      });

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.data.answer,
        confidence: response.data.confidence_score,
        timestamp: response.data.created_at
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your question. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      setUploadError(validationErrors.join('. '));
      return;
    }

    // Clear any previous errors
    setUploadError('');
    setUploadProgress(true);

    const formData = new FormData();
    formData.append('file', file);
    
    // Create a clean title (remove extension)
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
    formData.append('title', cleanTitle);

    try {
      setLoading(true);
      const response = await api.post('/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchDocuments();
      setSelectedDocument(response.data);
      setShowUpload(false);
      
      // Add welcome message
      const fileInfo = getFileTypeInfo(file);
      const welcomeMessage = {
        id: Date.now(),
        type: 'assistant',
        content: `Document "${response.data.title}" (${fileInfo.ext}, ${formatFileSize(file.size)}) has been uploaded and processed successfully! You can now ask questions about its content.`,
        timestamp: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMsg = error.response?.data?.error || 
                     error.response?.data?.file?.[0] || 
                     'Failed to upload document. Please try again.';
      setUploadError(errorMsg);
    } finally {
      setLoading(false);
      setUploadProgress(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    
    try {
      await api.delete(`/documents/${docId}/`);
      await fetchDocuments();
      if (selectedDocument?.id === docId) {
        const remainingDocs = documents.filter(doc => doc.id !== docId);
        setSelectedDocument(remainingDocs[0] || null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  // Render document item with extension
  const renderDocumentItem = (doc) => {
    const extension = doc.file_type ? doc.file_type.toUpperCase() : getFileExtension(doc.title);
    const fileInfo = getFileTypeInfo({ name: doc.title, type: '' });
    
    return (
      <div
        key={doc.id}
        className={`p-3 mb-2 rounded cursor-pointer group flex items-center justify-between ${
          selectedDocument?.id === doc.id
            ? 'bg-gray-700'
            : 'hover:bg-gray-800'
        }`}
        onClick={() => setSelectedDocument(doc)}
      >
        <div className="flex items-center min-w-0 flex-1">
          <span className="text-sm mr-2">{fileInfo.icon}</span>
          <div className="min-w-0 flex-1">
            <span className="text-sm truncate block">{doc.title}</span>
            <span className={`text-xs ${fileInfo.color} opacity-75`}>
              {extension} • {formatFileSize(doc.file_size)}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteDocument(doc.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded transition-opacity"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    );
  };

  if (documents.length === 0 && !showUpload) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-8">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to AI-Powered Q&A Web App</h1>
            <p className="text-gray-600">Upload a document to start asking questions about its content</p>
          </div>
          
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              {uploadError}
            </div>
          )}
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all ${
              dragActive 
                ? 'border-blue-500 bg-blue-50 scale-105' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            } ${uploadProgress ? 'pointer-events-none opacity-75' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploadProgress && fileInputRef.current?.click()}
          >
            {uploadProgress ? (
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-blue-600">Processing document...</p>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Drop a file here or click to upload</p>
                <p className="text-sm text-gray-500 mt-2">
                  Supported: <span className="font-medium">PDF, DOCX, DOC, TXT</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">Maximum size: 50MB</p>
              </>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.doc,.txt"
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
          />
          
          <button
            onClick={logout}
            className="mt-6 text-gray-500 hover:text-gray-700 flex items-center mx-auto transition-colors"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold">AI-Powered Q&A Web App</h1>
            <button
              onClick={() => setShowUpload(true)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Upload new document"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Documents */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {documents.map(renderDocumentItem)}
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <User className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm truncate">{user?.username}</span>
            </div>
            <button
              onClick={logout}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <MessageSquare className="h-5 w-5 mr-2 text-gray-600 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-medium truncate">
                {selectedDocument?.title || 'Select a document'}
              </h2>
              {selectedDocument && (
                <p className="text-xs text-gray-500">
                  {getFileExtension(selectedDocument.title)} • {formatFileSize(selectedDocument.file_size)}
                </p>
              )}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && selectedDocument && (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>Ask me anything about "{selectedDocument.title}"</p>
              <p className="text-xs text-gray-400 mt-1">
                {getFileTypeInfo({ name: selectedDocument.title }).ext} • {formatFileSize(selectedDocument.file_size)}
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-3xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' ? 'bg-blue-500' : 'bg-gray-600'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                </div>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.confidence && (
                    <div className="text-xs mt-2 opacity-70">
                      Confidence: {Math.round(message.confidence * 100)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex">
                <div className="mr-2">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {selectedDocument && (
          <div className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Upload new document"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a question about the document..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-500 hover:text-blue-600 disabled:text-gray-400 transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
            
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                {uploadError}
              </div>
            )}
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50 scale-105' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              } ${uploadProgress ? 'pointer-events-none opacity-75' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploadProgress && fileInputRef.current?.click()}
            >
              {uploadProgress ? (
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-blue-600">Processing document...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 font-medium">Drop a file here or click to upload</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported: <span className="font-medium">PDF, DOCX, DOC, TXT</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Maximum size: 50MB</p>
                </>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={uploadProgress}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.doc,.txt"
        onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
      />
    </div>
  );
}