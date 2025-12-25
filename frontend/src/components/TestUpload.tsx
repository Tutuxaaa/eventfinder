// frontend/src/components/TestUpload.tsx
import React, { useState } from 'react';
import { eventsApi } from '../api';

export const TestUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      console.log('Начинаем загрузку файла:', selectedFile.name);
      const data = await eventsApi.searchByPhotoLookup(selectedFile);
      console.log('Получен результат:', data);
      setResult(data);
    } catch (err: any) {
      console.error('Ошибка при загрузке:', err);
      setError(err.message || 'Произошла ошибка при загрузке');
    } finally {
      setUploading(false);
    }
  };

  const testOtherEndpoints = async () => {
    try {
      console.log('Тестируем GET /api/v1/events...');
      const events = await eventsApi.getAll();
      console.log('События:', events);
      alert(`Получено ${events.length} событий`);
    } catch (err: any) {
      console.error('Ошибка при тесте других эндпоинтов:', err);
      alert(`Ошибка: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Тест загрузки фото</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
        <br />
        <button 
          onClick={handleUpload} 
          disabled={uploading || !selectedFile}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? 'Загрузка...' : 'Загрузить фото'}
        </button>
        
        <button 
          onClick={testOtherEndpoints}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Тест других эндпоинтов
        </button>
      </div>

      {error && (
        <div style={{ color: 'red', padding: '10px', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          ❌ Ошибка: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
          <h3>✅ Результат получен!</h3>
          <pre style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px',
            overflow: 'auto'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
          
          <div style={{ marginTop: '10px' }}>
            <strong>Действие:</strong> {result.action}<br />
            <strong>ID события:</strong> {result.event_id}<br />
            <strong>Название:</strong> {result.event.title}<br />
            <strong>Дата:</strong> {result.event.date || 'не указана'}<br />
            <strong>Место:</strong> {result.event.location || 'не указано'}<br />
            <strong>Цена:</strong> {result.event.price || 'не указана'}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestUpload;