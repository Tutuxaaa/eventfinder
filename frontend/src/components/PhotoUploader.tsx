// frontend/src/components/PhotoUploader.tsx
import React, { useState, useRef } from 'react';
import { useEvents, ParseLookupResult } from '../api';

export const PhotoUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ParseLookupResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadPhoto, loading, error } = useEvents();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const result = await uploadPhoto(file);
    if (result) {
      setResult(result);
      
      // Показать сообщение в зависимости от действия
      const actionMessages = {
        matched: 'Найдено существующее событие!',
        created: 'Создано новое событие!',
        found_external: 'Событие найдено на внешнем сайте!',
      };
      alert(actionMessages[result.action]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreviewUrl(URL.createObjectURL(droppedFile));
      setResult(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="photo-uploader">
      <h2>Распознать афишу</h2>
      
      {!previewUrl ? (
        <div 
          className="upload-area"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div className="upload-placeholder">
            <p>Перетащите сюда изображение или кликните для выбора</p>
            <p>Поддерживаемые форматы: JPEG, PNG</p>
          </div>
        </div>
      ) : (
        <div className="preview-container">
          <div className="image-preview">
            <img src={previewUrl} alt="Preview" />
            <button onClick={handleClear} className="clear-btn">
              ×
            </button>
          </div>
          
          <div className="actions">
            <button 
              onClick={handleUpload} 
              disabled={loading}
              className="upload-btn"
            >
              {loading ? 'Обработка...' : 'Распознать афишу'}
            </button>
            <button onClick={handleClear} className="secondary-btn">
              Выбрать другое фото
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className={`result-card ${result.action}`}>
          <h3>
            {result.action === 'matched' && '✓ Найдено совпадение'}
            {result.action === 'created' && '✓ Создано новое событие'}
            {result.action === 'found_external' && '✓ Найдено на внешнем сайте'}
          </h3>
          
          <div className="event-info">
            <h4>{result.event.title}</h4>
            {result.event.date && (
              <p><strong>Дата:</strong> {new Date(result.event.date).toLocaleDateString('ru-RU')}</p>
            )}
            {result.event.location && (
              <p><strong>Место:</strong> {result.event.location}</p>
            )}
            {result.event.price && (
              <p><strong>Цена:</strong> {result.event.price} руб.</p>
            )}
            {result.event.description && (
              <p><strong>Описание:</strong> {result.event.description}</p>
            )}
            {result.source_url && (
              <p>
                <strong>Источник:</strong>{' '}
                <a href={result.source_url} target="_blank" rel="noopener noreferrer">
                  {result.source_url}
                </a>
              </p>
            )}
          </div>
          
          <div className="event-actions">
            <button 
              onClick={() => window.location.href = `/events/${result.event.id}`}
              className="view-btn"
            >
              Перейти к событию
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;