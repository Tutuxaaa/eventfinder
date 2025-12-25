import { useState, useRef } from "react";
import { Upload, Camera, X, Sparkles, Check, ExternalLink, Edit3, Calendar, MapPin, Info } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { motion } from "framer-motion";
import api from "../api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface PhotoSearchProps {
  onSearchComplete: (eventId: string) => void;
  onExternalEvent: (externalEvent: any) => void; // Для найденных внешних событий
  onClose: () => void;
}

interface SearchResult {
  status: 'matched' | 'created' | 'found_external';
  event?: any; // Для matched и created
  external_event?: any; // Для found_external
  confidence?: number;
  message: string;
  details?: string;
}

export function PhotoSearch({ onSearchComplete, onExternalEvent, onClose }: PhotoSearchProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      processImage(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    processImage(file);
    setSearchResult(null); // Сброс предыдущего результата при новой загрузке
  };

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSearchClick = async () => {
    if (!selectedFile) {
      window.alert("Файл не выбран");
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setSearchResult(null);

      // Простой визуальный прогресс
      const progInterval = setInterval(() => {
        setProgress((p) => Math.min(90, p + 10));
      }, 200);

      // Вызов нового endpoint
      const result = await api.searchByPhotoLookup(selectedFile);

      clearInterval(progInterval);
      setProgress(100);
      setSearchResult(result as unknown as SearchResult);

      // Дать пользователю увидеть 100% чуть-чуть
      setTimeout(() => setProgress(0), 500);
    } catch (err: any) {
      console.error("Photo search error:", err);
      window.alert("Ошибка при поиске по фото: " + (err?.message ?? err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToEvent = () => {
    if (searchResult?.status === 'matched' || searchResult?.status === 'created') {
      onSearchComplete(String(searchResult.event?.id ?? ''));
      onClose();
    }
  };

  const handleCreateFromExternal = () => {
    if (searchResult?.status === 'found_external' && searchResult.external_event) {
      onExternalEvent(searchResult.external_event);
      onClose();
    }
  };

  const resetSearch = () => {
    setUploadedImage(null);
    setSelectedFile(null);
    setSearchResult(null);
    setProgress(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return <Badge className="bg-green-500">Найдено в базе</Badge>;
      case 'created':
        return <Badge className="bg-blue-500">Создано</Badge>;
      case 'found_external':
        return <Badge className="bg-amber-500">Найдено внешнее</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl rounded-2xl bg-background p-8 max-h-[90vh] overflow-y-auto"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="mb-6 text-center">
          <h2 className="mb-2">Поиск по фото афиши</h2>
          <p className="text-muted-foreground">
            Загрузите фото афиши, и мы найдем событие для вас
          </p>
        </div>

        {!uploadedImage ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-10 w-10 text-primary" />
            </div>

            <h3 className="mb-2">Перетащите фото сюда</h3>
            <p className="mb-6 text-muted-foreground">или выберите файл с устройства</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/90"
              >
                <Upload className="mr-2 h-4 w-4" />
                Выбрать файл
              </Button>

              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                Сделать фото
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-xl">
              <img 
                src={uploadedImage} 
                alt="Uploaded" 
                className="h-64 w-full object-cover" 
              />
              {searchResult && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center text-white">
                    <Check className="mx-auto mb-2 h-12 w-12" />
                    <p className="text-lg font-semibold">Анализ завершен</p>
                  </div>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <span>Анализируем изображение...</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {searchResult ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        Результат поиска
                      </CardTitle>
                      {getStatusBadge(searchResult.status)}
                    </div>
                    <CardDescription>
                      {searchResult.message}
                      {searchResult.confidence && (
                        <span className="ml-2 text-xs">
                          (совпадение: {(searchResult.confidence * 100).toFixed(1)}%)
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {searchResult.status === 'matched' || searchResult.status === 'created' ? (
                      <>
                        {searchResult.event && (
                          <>
                            <h3 className="font-semibold text-lg">{searchResult.event.title}</h3>
                            <div className="space-y-2 text-sm">
                              {searchResult.event.date && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{new Date(searchResult.event.date).toLocaleDateString()}</span>
                                </div>
                              )}
                              {searchResult.event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{searchResult.event.location}</span>
                                </div>
                              )}
                              {searchResult.event.description && (
                                <p className="text-muted-foreground line-clamp-3">
                                  {searchResult.event.description}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : searchResult.status === 'found_external' && searchResult.external_event ? (
                      <>
                        <h3 className="font-semibold text-lg">{searchResult.external_event.title}</h3>
                        <div className="space-y-2 text-sm">
                          {searchResult.external_event.date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{new Date(searchResult.external_event.date).toLocaleDateString()}</span>
                            </div>
                          )}
                          {searchResult.external_event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{searchResult.external_event.location}</span>
                            </div>
                          )}
                          {searchResult.external_event.description && (
                            <p className="text-muted-foreground line-clamp-3">
                              {searchResult.external_event.description}
                            </p>
                          )}
                          <p className="text-xs text-amber-600 mt-2">
                            Это событие найдено во внешних источниках. Вы можете создать его в нашей базе.
                          </p>
                        </div>
                      </>
                    ) : null}

                    {searchResult.details && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm">
                        <p className="font-medium mb-1">Детали:</p>
                        <p>{searchResult.details}</p>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex flex-col sm:flex-row gap-3">
                    {(searchResult.status === 'matched' || searchResult.status === 'created') ? (
                      <>
                        <Button
                          onClick={handleGoToEvent}
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Перейти к карточке
                        </Button>
                        <Button
                          onClick={() => {
                            onSearchComplete(String(searchResult.event?.id ?? ''));
                            onClose();
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          <Edit3 className="mr-2 h-4 w-4" />
                          Редактировать
                        </Button>
                      </>
                    ) : searchResult.status === 'found_external' ? (
                      <Button
                        onClick={handleCreateFromExternal}
                        className="flex-1 bg-amber-500 hover:bg-amber-600"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Создать событие
                      </Button>
                    ) : null}

                    <Button
                      onClick={resetSearch}
                      variant="outline"
                      className="flex-1"
                    >
                      Загрузить другое фото
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ) : !isProcessing && (
              <div className="flex gap-3">
                <Button
                  onClick={resetSearch}
                  variant="outline"
                  className="flex-1"
                >
                  Загрузить другое
                </Button>
                <Button 
                  onClick={handleSearchClick} 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={!uploadedImage}
                >
                  Найти событие
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}