import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, Home, ChevronRight, ChevronLeft, Search, Check, ChevronsUpDown, ImageIcon, Printer, Download, Upload, FileText, History, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Room } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useLocation } from "wouter";
import { ImageUpload } from "@/components/ui/image-upload";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import {Checkbox} from "@/components/ui/checkbox";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Command, CommandEmpty, CommandGroup, CommandInput, CommandItem} from "@/components/ui/command";
import { NavBreadcrumb } from "@/components/layout/nav-breadcrumb";
import { DocumentUpload } from "@/components/ui/document-upload";
import * as XLSX from 'xlsx';

// Update interface to match database schema without version
interface Item {
  id: string;
  room_id: string;
  name: string;
  category: string;
  brand?: string;
  supplier?: string;
  specifications?: string;
  cost?: number;
  warranty_info?: string;
  installation_date?: string;
  maintenance_notes?: string;
  status?: string;
  image_url?: string;
  document_urls?: string[];
  created_at?: string;
  updated_at?: string;
  link?: string;
  notes?: string;
}

// Update interface to match database schema
interface Image {
  id: string;
  item_id: string;
  storage_path: string;
  filename: string;
  created_at: string;
}

// Add a History interface to match the database schema
interface ItemHistory {
  id: string;
  item_id: string;
  room_id: string;
  name: string;
  brand?: string;
  supplier?: string;
  specifications?: string;
  cost?: number;
  warranty_info?: string;
  installation_date?: string;
  maintenance_notes?: string;
  category: string;
  status?: string;
  image_url?: string;
  document_urls?: string[];
  link?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Update schema to include new fields
const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().optional(),
  supplier: z.string().optional(),
  specifications: z.string().optional(),
  cost: z.number().optional(),
  warranty_info: z.string().optional(),
  maintenance_notes: z.string().optional(),
  installation_date: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  status: z.string().optional(),
  image_url: z.string().optional(),
  document_urls: z.array(z.string()).optional(),
  link: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

// ItemCard component to handle individual item state
const ItemCard = ({ item, onDelete }: { item: Item; onDelete: (id: string) => void }) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  // Add state for full image view
  const [showFullImageDialog, setShowFullImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const { toast } = useToast();

  // Delete image mutation
  const deleteImage = useMutation({
    mutationFn: async (imageId: string) => {
      const { data, error } = await supabase
        .from('images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (error) throw error;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('item-images')
        .remove([data.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-images", item.id] });
      toast({
        title: "Success",
        description: "Image deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete image",
        variant: "destructive"
      });
    }
  });

  // Delete document mutation
  const deleteDocument = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase.storage
        .from('item-documents')
        .remove([`${item.id}/${fileName}`]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-documents", item.id] });
      toast({
        title: "Success",
        description: "Document deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive"
      });
    }
  });

  // Initialize form
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: item.name,
      brand: item.brand || "",
      supplier: item.supplier || "",
      specifications: item.specifications || "",
      cost: item.cost || undefined,
      warranty_info: item.warranty_info || "",
      maintenance_notes: item.maintenance_notes || "",
      installation_date: item.installation_date || "",
      category: item.category,
      status: item.status || "",
      document_urls: item.document_urls || [],
      link: item.link || "",
      notes: item.notes || "",
    },
  });

  // Query to fetch images for this item
  const { data: images = [] } = useQuery<Image[]>({
    queryKey: ["item-images", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("item_id", item.id);

      if (error) throw error;
      return data || [];
    }
  });

  const { data: documents = [] } = useQuery<{ name: string, url: string }[]>({
    queryKey: ["item-documents", item.id],
    queryFn: async () => {
      const { data: files, error } = await supabase.storage
        .from('item-documents')
        .list(item.id);

      if (error) throw error;

      const docs = await Promise.all(
        (files || []).map(async (file) => {
          const { data } = supabase.storage
            .from('item-documents')
            .getPublicUrl(`${item.id}/${file.name}`);

          return {
            name: file.name,
            url: data.publicUrl
          };
        })
      );

      return docs;
    }
  });

  // Add history query
  const { data: itemHistory = [] } = useQuery<ItemHistory[]>({
    queryKey: ["item-history", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_history")
        .select("*")
        .eq("item_id", item.id);

      if (error) throw error;
      return data || [];
    }
  });

  const updateItem = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const timestamp = new Date().toISOString();

      // Insert current state into history first
      const { error: historyError } = await supabase
        .from("item_history")
        .insert([{
          item_id: item.id,
          room_id: item.room_id,
          name: item.name,
          brand: item.brand,
          supplier: item.supplier,
          specifications: item.specifications,
          cost: item.cost,
          warranty_info: item.warranty_info,
          installation_date: item.installation_date,
          maintenance_notes: item.maintenance_notes,
          category: item.category,
          status: item.status,
          image_url: item.image_url,
          document_urls: item.document_urls,
          link: item.link,
          notes: item.notes,
          created_at: timestamp,
          updated_at: timestamp
        }]);

      if (historyError) throw historyError;

      // Now update the item with new values and current timestamp
      const { error: updateError } = await supabase
        .from("items")
        .update({
          name: values.name,
          brand: values.brand || null,
          supplier: values.supplier || null,
          specifications: values.specifications || null,
          cost: values.cost || null,
          warranty_info: values.warranty_info || null,
          maintenance_notes: values.maintenance_notes || null,
          installation_date: values.installation_date || null,
          category: values.category,
          status: values.status || null,
          document_urls: values.document_urls || [],
          link: values.link || null,
          notes: values.notes || null,
          updated_at: timestamp
        })
        .eq('id', item.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", item.room_id] });
      queryClient.invalidateQueries({ queryKey: ["item-history", item.id] });
      setShowEditDialog(false);
      toast({
        title: "Success",
        description: "Item updated successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (values: ItemFormValues) => {
    updateItem.mutate(values);
  };

  const Label = ({htmlFor, children}: {htmlFor: string, children: React.ReactNode}) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
    </label>
  );

  return (
    <div className="item-card-border card-interactive">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-grow space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{item.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Category: {item.category}
          </p>
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-0.5">{images.length || 0}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowImageDialog(true)}
                className="h-8 w-8"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-0.5">{itemHistory.length || 0}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistoryDialog(true)}
                className="h-8 w-8"
              >
                <History className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-0.5">{documents.length || 0}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDocumentDialog(true)}
                className="h-8 w-8"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDetailsVisible(!isDetailsVisible)}
            >
              {isDetailsVisible ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isDetailsVisible && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  {item.brand && (
                    <div className="field-container">
                      <span className="field-label">Brand:</span>
                      <span className="field-value">{item.brand}</span>
                    </div>
                  )}
                  {item.supplier && (
                    <div className="field-container">
                      <span className="field-label">Supplier:</span>
                      <span className="field-value">{item.supplier}</span>
                    </div>
                  )}
                  {item.specifications && (
                    <div className="field-container">
                      <span className="field-label">Specifications:</span>
                      <span className="field-value">{item.specifications}</span>
                    </div>
                  )}
                  {item.status && (
                    <div className="field-container">
                      <span className="field-label">Status:</span>
                      <span className="field-value">{item.status}</span>
                    </div>
                  )}
                  {item.warranty_info && (
                    <div className="field-container">
                      <span className="field-label">Warranty:</span>
                      <span className="field-value">{item.warranty_info}</span>
                    </div>
                  )}
                  {item.maintenance_notes && (
                    <div className="field-container">
                      <span className="field-label">Maintenance:</span>
                      <span className="field-value">{item.maintenance_notes}</span>
                    </div>
                  )}
                  {item.installation_date && (
                    <div className="field-container">
                      <span className="field-label">Installed:</span>
                      <span className="field-value">{item.installation_date}</span>
                    </div>
                  )}
                  {item.cost !== null && item.cost !== undefined && (
                    <div className="field-container">
                      <span className="field-label">Cost:</span>
                      <span className="field-value">${item.cost.toString()}</span>
                    </div>
                  )}
                  {item.link && (
                    <div className="field-container">
                      <span className="field-label">Link:</span>
                      <span className="field-value">
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline">
                          Link to Product
                        </a>
                      </span>
                    </div>
                  )}
                  {item.notes && (
                    <div className="field-container">
                      <span className="field-label">Notes:</span>
                      <span className="field-value">{item.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modified image carousel to handle image click */}
              {images && images.length > 0 && (
                <div className="w-full max-w-md mx-auto">
                  <Carousel className="w-full relative">
                    <CarouselContent>
                      {images.map((image) => (
                        <CarouselItem key={image.id}>
                          <div className="relative aspect-video w-full">
                            <img
                              src={`${supabase.storage.from('item-images').getPublicUrl(image.storage_path).data?.publicUrl}`}
                              alt={`${item.name} image`}
                              className="object-contain w-full h-full rounded-md cursor-pointer"
                              onClick={() => {
                                setSelectedImage(image);
                                setShowFullImageDialog(true);
                              }}
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this image?')) {
                                  deleteImage.mutate(image.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                    <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 z-10" />
                  </Carousel>
                </div>
              )}

              {/* Updated documents section with delete buttons */}
              {isDetailsVisible && documents && documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Documents</h4>
                  <div className="grid gap-2">
                    {documents.map((doc) => (
                      <div key={doc.name} className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-md">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="h-4 w-4" />
                          {doc.name}
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this document?')) {
                              deleteDocument.mutate(doc.name);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Images - {item.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <ImageUpload
              itemId={item.id}
              onUploadComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["item-images", item.id] });
                setShowImageDialog(false);
                toast({
                  title: "Success",
                  description: "Images uploaded successfully"
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[65vh] px-4">
              <div className="space-y-4 pr-4">
                <div>
                  <Label htmlFor="name">Name*</Label>
                  <Input {...form.register("name")} id="name" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input {...form.register("brand")} id="brand" />
                  </div>
                  <div>
                    <Label htmlFor="supplier">Supplier</Label>
                    <Input {...form.register("supplier")} id="supplier" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specifications">Specifications</Label>
                  <Textarea {...form.register("specifications")} id="specifications" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      {...form.register("cost", {
                        setValueAs: (v) => v === "" ? undefined : parseFloat(v)
                      })}
                      type="number"
                      step="0.01"
                      id="cost"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input {...form.register("category")} id="category" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="warranty_info">Warranty Information</Label>
                  <Textarea {...form.register("warranty_info")} id="warranty_info" />
                </div>

                <div>
                  <Label htmlFor="maintenance_notes">Maintenance Notes</Label>
                  <Textarea {...form.register("maintenance_notes")} id="maintenance_notes" />
                </div>

                <div>
                  <Label htmlFor="installation_date">Installation Date</Label>
                  <Input {...form.register("installation_date")} type="date" id="installation_date" />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Input {...form.register("status")} id="status" />
                </div>
                <div>
                  <Label htmlFor="link">External Link</Label>
                  <Input {...form.register("link")} id="link" />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea {...form.register("notes")} id="notes" />
                </div>
              </div>
            </ScrollArea>

            <Button
              type="submit"
              className="w-full"
              disabled={updateItem.isPending}
            >
              {updateItem.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{item.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(item.id);
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Add this dialog for document upload */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Documents - {item.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <DocumentUpload
              itemId={item.id}
              onUploadComplete={() => {
                queryClient.invalidateQueries({ queryKey: ["item-documents", item.id] });
                setShowDocumentDialog(false);
                toast({
                  title: "Success",
                  description: "Documents uploaded successfully"
                });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Add History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Item History - {item.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-6 p-4">
              {itemHistory?.map((version, index) => (
                <div key={version.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">
                      Version from {new Date(version.created_at).toLocaleDateString()}
                    </h4>
                    <span className="text-sm text-muted-foreground">
                      {new Date(version.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Name:</strong> {version.name}</p>
                      {version.brand && <p><strong>Brand:</strong> {version.brand}</p>}
                      {version.supplier && <p><strong>Supplier:</strong> {version.supplier}</p>}
                      {version.specifications && (
                        <p><strong>Specifications:</strong> {version.specifications}</p>
                      )}
                      {version.cost && <p><strong>Cost:</strong> ${version.cost}</p>}
                    </div>
                    <div>
                      {version.warranty_info && (
                        <p><strong>Warranty:</strong> {version.warranty_info}</p>
                      )}
                      {version.installation_date && (
                        <p><strong>Installation Date:</strong> {version.installation_date}</p>
                      )}
                      {version.maintenance_notes && (
                        <p><strong>Maintenance Notes:</strong> {version.maintenance_notes}</p>
                      )}
                      <p><strong>Category:</strong> {version.category}</p>
                      {version.status && <p><strong>Status:</strong> {version.status}</p>}
                      {version.link && (
                        <p><strong>Link:</strong> <a href={version.link} target="_blank" rel="noopener noreferrer">{version.link}</a></p>
                      )}
                      {version.notes && <p><strong>Notes:</strong> {version.notes}</p>}
                    </div>
                  </div>
                </div>
              ))}
              {(!itemHistory || itemHistory.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No history found for this item.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Full Image View Dialog */}
      {selectedImage && (
        <Dialog open={showFullImageDialog} onOpenChange={setShowFullImageDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <div className="relative h-full w-full flex items-center justify-center bg-black/80">
              <img
                src={`${supabase.storage.from('item-images').getPublicUrl(selectedImage.storage_path).data?.publicUrl}`}
                alt={`${item.name} full view`}
                className="max-h-[80vh] max-w-full object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 text-white hover:bg-white/20"
                onClick={() => setShowFullImageDialog(false)}
              >
                <X className="h-6 w-6" />
              </Button>
              
              {/* Navigation buttons */}
              {images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10"
                    onClick={() => {
                      const currentIndex = images.findIndex(img => img.id === selectedImage.id);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
                      setSelectedImage(images[prevIndex]);
                    }}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10"
                    onClick={() => {
                      const currentIndex = images.findIndex(img => img.id === selectedImage.id);
                      const nextIndex = (currentIndex + 1) % images.length;
                      setSelectedImage(images[nextIndex]);
                    }}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}
              
              {/* Image counter */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {images.findIndex(img => img.id === selectedImage.id) + 1} / {images.length}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface FinishHistory {
  id: string;
  finish_id: string;
  version: number;
  change_type: string;
  previous_data: string;
  changed_by: string;
  changed_at: string;
}

interface RoomPageProps {
  id?: string;
}

export default function RoomPage({ id }: RoomPageProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [categoryValue, setCategoryValue] = useState("");
  const [showExportDialog, setShowExportDialog] = useState(false);


  // Add categories query
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category")
        .select("name")
        .order("name");

      if (error) throw error;
      return data.map(cat => cat.name);
    },
  });

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      brand: "",
      supplier: "",
      specifications: "",
      cost: undefined,
      warranty_info: "",
      maintenance_notes: "",
      installation_date: "",
      category: "",
      status: "",
      image_url: "",
      document_urls: [],
      link: "",
      notes: "",
    },
  });

  const { data: room } = useQuery<Room & { projects: { name: string; id: string } }>({
    queryKey: ["room", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("rooms")
        .select(`
          *,
          projects (
            id,
            name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Update the items query to properly include project context
  const { data: items } = useQuery({
    queryKey: ["items", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      // Get items with room and project context
      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          rooms (
            name,
            projects (
              name,
              user_id
            )
          )
        `)
        .eq("room_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Filter items based on search query
  const filteredItems = items?.filter(item => {
    if (!searchQuery.trim()) {
      // If no search query, only show items from current room
      return item.room_id === id;
    }

    const searchLower = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.brand?.toLowerCase().includes(searchLower) ||
      item.supplier?.toLowerCase().includes(searchLower) ||
      item.specifications?.toLowerCase().includes(searchLower) ||
      item.status?.toLowerCase().includes(searchLower) ||
      item.notes?.toLowerCase().includes(searchLower)
    );
  });

  const createItem = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      if (!id || !room) throw new Error("No room ID provided");

            try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          throw new Error("No authenticated session found");
        }

        const { data, error } = await supabase
          .from("items")
          .insert([{
            room_id: id,
            name: values.name,
            category: values.category,
            brand: values.brand || null,
            supplier: values.supplier || null,
            specifications: values.specifications || null,
            cost: values.cost || null,
            warranty_info: values.warranty_info || null,
            maintenance_notes: values.maintenance_notes || null,
            installation_date: values.installation_date || null,
            status: values.status || null,
            image_url: values.image_url || null,
            document_urls: values.document_urls || [],
            created_at: new Date().toISOString(),
            link: values.link || null,
            notes: values.notes || null,
          }])
          .select();

        if (error) throw error;
        return data[0];
      } catch (error: any) {
        console.error("Error creating item:", {
          error,
          message: error?.message,
          details: error?.details
        });
        throw new Error(error?.message || "Failed to save item");
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["items", id] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Item added successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save item",
        variant: "destructive"
      });
    }
  });

  // Update delete mutation with proper error handling
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      try {
        // First delete the item history records
        const { error: historyError } = await supabase
          .from("item_history")
          .delete()
          .eq("item_id", itemId);

        if (historyError) throw historyError;

        // Then delete the item itself
        const { error: itemError } = await supabase
          .from("items")
          .delete()
          .eq("id", itemId);

        if (itemError) throw itemError;
      } catch (error) {
        console.error('Delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", id] });
      toast({
        title: "Success",
        description: "Item deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive"
      });
    }
  });

  // Update bulk delete mutation with proper error handling
  const bulkDeleteItems = useMutation({
    mutationFn: async (itemIds: string[]) => {
      try {
        // First delete all history records for these items
        const { error: historyError } = await supabase
          .from("item_history")
          .delete()
          .in("item_id", itemIds);

        if (historyError) throw historyError;

        // Then delete the items
        const { error: itemsError } = await supabase
          .from("items")
          .delete()
          .in("id", itemIds);

        if (itemsError) throw itemsError;
      } catch (error) {
        console.error('Bulk delete error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", id] });
      setSelectedItems([]);
      setShowBulkDeleteDialog(false);
      toast({
        title: "Success",
        description: "Items deleted successfully"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete items",
        variant: "destructive"
      });
    }
  });

  const handleBulkDelete = () => {
    bulkDeleteItems.mutate(selectedItems);
    setShowBulkDeleteDialog(false);
  };

  // Add exportToExcel function to RoomPage component scope
  const exportToExcel = async (items: Item[]) => {
    if (!items || items.length === 0) {
      toast({
        title: "Export Failed",
        description: "No items available to export",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get items with room and project context
      const { data: projectItems, error } = await supabase
        .from("items")
        .select(`
          *,
          rooms (
            name,
            projects (
              name
            )
          )
        `)
        .eq("room_id", id);

      if (error) throw error;

      const exportData = (projectItems || []).map(item => ({
        'Room': item.rooms?.name || '',
        'Project': item.rooms?.projects?.name || '',
        'Name': item.name,
        'Category': item.category,
        'Brand': item.brand || '',
        'Supplier': item.supplier || '',
        'Specifications': item.specifications || '',
        'Cost': item.cost || '',
        'Warranty Info': item.warranty_info || '',
        'Installation Date': item.installation_date || '',
        'Maintenance Notes': item.maintenance_notes || '',
        'Status': item.status || '',
        'Link': item.link || '',
        'Notes': item.notes || '',
        'Created At': new Date(item.created_at || '').toLocaleDateString(),
        'Updated At': new Date(item.updated_at || '').toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Items");

      const fileName = `${room?.name || 'room'}_items_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Success",
        description: "Items exported successfully"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export items",
        variant: "destructive"
      });
    }
  };

  const handleDelete = (itemId: string) => {
    deleteItem.mutate(itemId);
  };

  // Removed redundant filteredItems2

  // Update the deleteRoom mutation in the component to handle the deletion
  const deleteRoom = useMutation({
    mutationFn: async (roomId: string) => {
      // The deletion will cascade through items and item_history
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "Success",
        description: "Area and all related items deleted successfully"
      });
      // Navigate back to the project page
      setLocation("/project");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete area",
        variant: "destructive"
      });
    }
  });

  // Add the delete handler
  const handleRoomDelete = (roomId: string) => {
    if (confirm("Are you sure you want to delete this area and all its items? This action cannot be undone.")) {
      deleteRoom.mutate(roomId);
    }
  };

  if (!room) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <NavBreadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: room?.projects?.name || "Project", href: `/project/${room?.projects?.id}` },
          { label: room?.name || "Area" }
        ]}
      />

      <div className="sticky top-0 bg-background z-10 pb-2 border-b">
        <div className="card-simple-border shadow-sm">
          <div className="space-y-4">
            {/* Room Details - Full Width */}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{room?.name}</h1>
              <div className="mt-1 space-y-1">
                <p className="text-muted-foreground">
                  {room?.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {room?.floor_number !== null && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Floor:</span>
                      {room.floor_number}
                    </div>
                  )}
                  {room?.dimensions && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Size:</span>
                      {room.dimensions}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search and Actions - Full Width */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Export Items</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Choose Format</h3>
                        <div className="flex gap-4">
                          <Button
                            variant="outline"
                            onClick={() => exportToExcel(filteredItems || [])}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Excel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setLocation(`/print/${id}`);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Printer className="h-4 w-4" />
                            Print View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(filteredItems || [])}
                  disabled={!items || items.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                      <p className="text-sm text-muted-foreground">
                        Add details about the item used in this room. Required fields are marked with *.
                      </p>
                    </DialogHeader>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => createItem.mutate(data))} className="space-y-4">
                        <ScrollArea className="h-[65vh]">
                          <div className="space-y-4 px-4 pr-8">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name*</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Item name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category*</FormLabel>
                                  <FormControl>
                                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          aria-expanded={openCombobox}
                                          className="w-full justify-between"
                                        >
                                          {field.value
                                            ? categories?.find((category) => category === field.value)
                                            : "Select category..."}
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                        <Command>
                                          <CommandInput placeholder="Search category..." />
                                          <CommandEmpty>No category found.</CommandEmpty>
                                          <div className="max-h-[200px] overflow-y-auto">
                                            <CommandGroup>
                                              {categories?.map((category) => (
                                                <CommandItem
                                                  key={category}
                                                  value={category}
                                                  onSelect={() => {
                                                    form.setValue("category", category);
                                                    setOpenCombobox(false);
                                                  }}
                                                >
                                                  <Check
                                                    className={cn(
                                                      "mr-2 h-4 w-4",
                                                      field.value === category ? "opacity-100" : "opacity-0"
                                                    )}
                                                  />
                                                  {category}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </div>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Brand</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Brand" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="supplier"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Supplier</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Supplier" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="specifications"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Specifications</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Item specifications" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="cost"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cost</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Cost"
                                        {...field}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          field.onChange(value === "" ? undefined : parseFloat(value));
                                        }}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="installation_date"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Installation Date</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="warranty_info"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Warranty Information</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Warranty details" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="maintenance_notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Maintenance Notes</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Maintenance information" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Current status" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="link"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>External Link</FormLabel>
                                  <FormControl>
                                    <Input placeholder="https://..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Additional Notes</FormLabel>
                                  <FormControl>
                                    <Textarea placeholder="Any additional notes" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </ScrollArea>

                        <div className="flex justify-end gap-4 pt-4">
                          <Button
                            type="submit"
                            disabled={createItem.isPending}
                          >
                            {createItem.isPending ? "Adding..." : "Add Item"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                {isSelectionMode ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.length} selected
                    </span>
                    {selectedItems.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        disabled={bulkDeleteItems.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedItems([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsSelectionMode(true)}>
                      Select Items
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Item list - Full Width */}
      <div className="py-6">
        <div className="grid w-full gap-4">
          {filteredItems?.map((item) => (
            <div key={item.id} className="flex items-start gap-4 w-full">
              {isSelectionMode && (
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onClick={() => {
                    setSelectedItems(prev =>
                      prev.includes(item.id)
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id]
                    );
                  }}
                />
              )}
              <div className="flex-1 w-full">
                <ItemCard
                  item={item}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          ))}
          {filteredItems?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No items found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedItems.length} selected items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleteItems.isPending}
            >
              {bulkDeleteItems.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}