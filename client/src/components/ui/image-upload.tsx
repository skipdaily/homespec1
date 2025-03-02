import { useState, useCallback } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, AlertCircle, FileIcon } from "lucide-react";
import { Image } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { checkStorageAccess } from "@/lib/supabase-storage";

interface ImageUploadProps {
  itemId: string;
  onUploadComplete?: () => void;
}

type FileWithPreview = {
  file: File;
  preview?: string;
  type: 'image' | 'pdf';
};

export function ImageUpload({ itemId, onUploadComplete }: ImageUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // Check if storage is properly configured
  const { data: storageAccessible, isLoading: checkingStorage } = useQuery({
    queryKey: ["storage-access"],
    queryFn: async () => {
      const [imagesAccess, documentsAccess] = await Promise.all([
        checkStorageAccess('item-images'),
        checkStorageAccess('item-documents')
      ]);
      return imagesAccess && documentsAccess;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileWithPreview[]) => {
      if (!storageAccessible) {
        throw new Error("Storage buckets not configured");
      }

      setUploading(true);
      const uploadedFiles: Image[] = [];

      try {
        for (const fileData of files) {
          const { file } = fileData;
          const isImage = file.type.startsWith('image/');
          const isPDF = file.type === 'application/pdf';

          if (!isImage && !isPDF) {
            throw new Error(`${file.name} is not a supported file type`);
          }

          const maxSize = 5 * 1024 * 1024; // 5MB limit
          if (file.size > maxSize) {
            throw new Error(`${file.name} exceeds 5MB limit`);
          }

          // Choose bucket based on file type
          const bucket = isImage ? 'item-images' : 'item-documents';
          const fileExt = file.name.split('.').pop();
          const filePath = `${itemId}/${Date.now()}.${fileExt}`;

          const { data: storageData, error: storageError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

          if (storageError) throw storageError;

          // Create file metadata record
          const { data: imageData, error: dbError } = await supabase
            .from('images')
            .insert([{
              item_id: itemId,
              storage_path: filePath,
              filename: file.name,
              size: file.size,
              mime_type: file.type,
              bucket: bucket
            }])
            .select()
            .single();

          if (dbError) throw dbError;

          uploadedFiles.push(imageData);
        }

        return uploadedFiles;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (uploadedFiles) => {
      queryClient.invalidateQueries({ queryKey: ["item-images", itemId] });
      setFiles([]);
      toast({
        title: "Success",
        description: `Successfully uploaded ${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'}`,
      });
      onUploadComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please upload images or PDFs only.`,
          variant: "destructive",
        });
        return false;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: `${file.name} exceeds 5MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    }).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('image/') ? 'image' as const : 'pdf' as const
    }));

    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => {
      const newFiles = prevFiles.filter((_, i) => i !== index);
      prevFiles[index].preview && URL.revokeObjectURL(prevFiles[index].preview);
      return newFiles;
    });
  };

  const handleUpload = () => {
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  if (checkingStorage) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!storageAccessible) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Storage Not Configured</AlertTitle>
        <AlertDescription>
          Please create storage buckets named 'item-images' and 'item-documents' in your Supabase dashboard with the following settings:
          <ul className="list-disc list-inside mt-2">
            <li>Bucket names: item-images, item-documents</li>
            <li>Public bucket: Yes</li>
            <li>File size limit: 5MB</li>
            <li>Allowed mime types: image/jpeg, image/png, image/gif, application/pdf</li>
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors duration-200 ease-in-out",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          "cursor-pointer text-center"
        )}
      >
        <Input
          id="file-upload"
          type="file"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center gap-2 cursor-pointer"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop files here or click to select
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: JPG, PNG, GIF, PDF (up to 5MB)
          </p>
        </Label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileData, index) => (
            <div key={index} className="flex items-center justify-between gap-2 p-2 border rounded">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-10 w-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                  {fileData.type === 'image' && fileData.preview ? (
                    <img
                      src={fileData.preview}
                      alt={fileData.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <span className="truncate text-sm flex-1">{fileData.file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFile(index)}
                className="h-8 w-8 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            onClick={handleUpload}
            disabled={uploading || uploadMutation.isPending}
            className="w-full"
          >
            {(uploading || uploadMutation.isPending) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} file{files.length === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}