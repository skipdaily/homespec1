import { useState, useCallback, useEffect } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, AlertCircle } from "lucide-react";
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

export function ImageUpload({ itemId, onUploadComplete }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  // Check if storage is properly configured
  const { data: storageAccessible, isLoading: checkingStorage } = useQuery({
    queryKey: ["storage-access"],
    queryFn: checkStorageAccess,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      if (!storageAccessible) {
        throw new Error("Storage bucket not configured");
      }

      setUploading(true);
      const uploadedImages: Image[] = [];

      try {
        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            throw new Error(`${file.name} is not an image file`);
          }
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
            throw new Error(`${file.name} exceeds 5MB limit`);
          }

          // Upload file to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const filePath = `${itemId}/${Date.now()}.${fileExt}`;

          const { data: storageData, error: storageError } = await supabase.storage
            .from('item-images')
            .upload(filePath, file);

          if (storageError) throw storageError;

          // Create image metadata record
          const { data: imageData, error: dbError } = await supabase
            .from('images')
            .insert([{
              item_id: itemId,
              storage_path: storageData.path,
              filename: file.name,
              size: file.size,
              mime_type: file.type
            }])
            .select()
            .single();

          if (dbError) throw dbError;

          uploadedImages.push(imageData);
        }

        return uploadedImages;
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (uploadedImages) => {
      queryClient.invalidateQueries({ queryKey: ["item-images", itemId] });
      setFiles([]);
      toast({
        title: "Success",
        description: `Successfully uploaded ${uploadedImages.length} image${uploadedImages.length === 1 ? '' : 's'}`,
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
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
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
    });
    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
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
          Please create a storage bucket named 'item-images' in your Supabase dashboard with the following settings:
          <ul className="list-disc list-inside mt-2">
            <li>Bucket name: item-images</li>
            <li>Public bucket: Yes</li>
            <li>File size limit: 5MB</li>
            <li>Allowed mime types: image/jpeg, image/png, image/gif</li>
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
          id="image-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Label
          htmlFor="image-upload"
          className="flex flex-col items-center justify-center gap-2 cursor-pointer"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag & drop images here or click to select
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: JPG, PNG, GIF (up to 5MB)
          </p>
        </Label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between gap-2 p-2 border rounded">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-10 w-10 rounded overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="truncate text-sm flex-1">{file.name}</span>
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
                Upload {files.length} image{files.length === 1 ? '' : 's'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}