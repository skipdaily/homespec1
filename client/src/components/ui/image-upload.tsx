import { useState, useCallback } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { Image, insertImageSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  itemId: string;
  onUploadComplete?: (images: Image[]) => void;
}

export function ImageUpload({ itemId, onUploadComplete }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      setUploading(true);
      const uploadedImages: Image[] = [];

      try {
        for (const file of files) {
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
              mime_type: file.type,
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
      onUploadComplete?.(uploadedImages);
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
    // Validate file types and sizes
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
    setFiles(validFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

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