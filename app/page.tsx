'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

declare global {
  interface Window {
    renderMathInElement: (element: HTMLElement, options?: any) => void;
    katex: any;
  }
}

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKaTeXReady, setIsKaTeXReady] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Check if KaTeX is ready
  useEffect(() => {
    const checkKaTeX = () => {
      if (typeof window !== 'undefined' && window.katex && window.renderMathInElement) {
        setIsKaTeXReady(true);
      }
    };

    // Check immediately
    checkKaTeX();

    // Also check after a short delay to ensure scripts are loaded
    const timer = setTimeout(checkKaTeX, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Function to render math formulas
  const renderMath = useCallback(() => {
    if (!isKaTeXReady) return;

    try {
      const element = document.getElementById('math-content');
      if (element && window.renderMathInElement) {
        window.renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false,
          trust: true
        });
      }
    } catch (error) {
      console.error('Error rendering math:', error);
    }
  }, [isKaTeXReady]);

  // Render math when response changes
  useEffect(() => {
    if (response && isKaTeXReady) {
      // Small delay to ensure DOM is updated
      setTimeout(renderMath, 100);
    }
  }, [response, isKaTeXReady, renderMath]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(file);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setShowModal(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleSubmit = async () => {
    if (!image) return;

    setLoading(true);
    setResponse('');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', image);

      const response = await fetch('/api/solve', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        if (text.startsWith('Error:')) {
          setError(text);
          break;
        }
        setResponse(prev => prev + text);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while processing your request.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeImage = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col">
      <div className="flex-grow">
        <h1 className="text-3xl font-bold mb-8 text-center">AI Exercise Solver</h1>
        
        <div className="space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <div className="space-y-4">
                <div className="relative w-full h-64">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChangeImage();
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Đổi câu hỏi
                </button>
              </div>
            ) : (
              <p className="text-gray-500">
                {isDragActive
                  ? 'Thả ảnh vào đây'
                  : 'Kéo và thả ảnh vào đây, hoặc click để chọn'}
              </p>
            )}
          </div>

          {image && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : 'Giải bài tập'}
            </button>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h2 className="text-xl font-semibold mb-2 text-red-600">Lỗi:</h2>
              <div className="text-red-600">{error}</div>
            </div>
          )}

          {response && !error && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-2">Lời giải:</h2>
              <div 
                id="math-content"
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: response }}
              />
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                Lời giải được cung cấp bởi AI nên có thể vẫn còn sai sót, các bạn nên xem từng bước giải và kiểm tra lại nhé.
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-8 text-center text-gray-600">
        <a 
          href="https://gouni.edu.vn" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-blue-600 transition-colors"
        >
          GoUni Education
        </a>
      </footer>

      {/* Image Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Chọn hình ảnh mới</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
            >
              <input {...getInputProps()} />
              <p className="text-gray-500">
                {isDragActive
                  ? 'Thả ảnh vào đây'
                  : 'Kéo và thả ảnh vào đây, hoặc click để chọn'}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 