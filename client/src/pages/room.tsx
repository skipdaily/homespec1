import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, History, Home, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Room } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";

// Interface for Item
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
}

// Schema for the form
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
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

// Image upload component
const ImageUpload = ({ 
  imageUrl, 
  onUpload 
}: { 
  imageUrl?: string; 
  onUpload: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload image to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
          <img
            src={imageUrl}
            alt="Item preview"
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept="image/*"
          onChange={uploadImage}
          disabled={uploading}
          className="cursor-pointer"
        />
        {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
      </div>
    </div>
  );
};

// ItemCard component to display items
const ItemCard = ({ item, onDelete }: { item: Item; onDelete: (id: string) => void }) => {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

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
      image_url: item.image_url || "",
      document_urls: item.document_urls || [],
    },
  });

  const { toast } = useToast();

  const updateItem = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const { data, error } = await supabase
        .from("items")
        .update({
          ...values,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", item.room_id] });
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

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-grow">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-sm text-muted-foreground">
            Category: {item.category}
          </p>
        </div>
        <div className="flex items-center space-x-2">
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
      </div>

      {isDetailsVisible && (
        <div className="space-y-4 mt-4 pt-4 border-t">
          {item.image_url && (
            <div className="aspect-video w-full overflow-hidden rounded-lg border">
              <img
                src={item.image_url}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="space-y-2">
            {item.brand && (
              <p className="text-sm text-muted-foreground">
                Brand: {item.brand}
              </p>
            )}
            {item.supplier && (
              <p className="text-sm text-muted-foreground">
                Supplier: {item.supplier}
              </p>
            )}
            {item.specifications && (
              <p className="text-sm text-muted-foreground">
                Specifications: {item.specifications}
              </p>
            )}
            {item.status && (
              <p className="text-sm text-muted-foreground">
                Status: {item.status}
              </p>
            )}
            {item.warranty_info && (
              <p className="text-sm text-muted-foreground">
                Warranty: {item.warranty_info}
              </p>
            )}
            {item.maintenance_notes && (
              <p className="text-sm text-muted-foreground">
                Maintenance: {item.maintenance_notes}
              </p>
            )}
            {item.installation_date && (
              <p className="text-sm text-muted-foreground">
                Installed: {item.installation_date}
              </p>
            )}
            {item.cost !== null && item.cost !== undefined && (
              <p className="text-sm text-muted-foreground">
                Cost: ${item.cost.toString()}
              </p>
            )}
          </div>
        </div>
      )}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ScrollArea className="h-[65vh] px-4">
                <div className="space-y-4 pr-4">
                  <FormField
                    control={form.control}
                    name="image_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Image</FormLabel>
                        <FormControl>
                          <ImageUpload
                            imageUrl={field.value}
                            onUpload={(url) => field.onChange(url)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name*</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter item name" {...field} />
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
                            <Input placeholder="e.g., Paint, Flooring" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Rest of the form fields remain the same */}
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
          </Form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};

// Main Room Page component
export default function RoomPage({ id }: { id?: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    },
  });

  // Query for room data
  const { data: room } = useQuery<Room>({
    queryKey: ["room", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("rooms")
        .select("*, projects(name)")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Query for items in the room
  const { data: items } = useQuery<Item[]>({
    queryKey: ["items", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("room_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Mutation to create a new item
  const createItem = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("items")
        .insert([{
          room_id: id,
          ...values,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
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

  // Mutation to delete an item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
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

  const onSubmit = (values: ItemFormValues) => {
    createItem.mutate(values);
  };

  const handleDelete = (itemId: string) => {
    deleteItem.mutate(itemId);
  };

  if (!room) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="flex items-center space-x-2 mb-6 text-sm text-muted-foreground">
        <Link href="/dashboard" className="flex items-center hover:text-primary">
          <Home className="h-4 w-4 mr-1" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/project/${room.project_id}`} className="hover:text-primary">
          {room.projects?.name || "Project"}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{room.name}</span>
      </nav>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{room.name}</h1>
          <p className="text-muted-foreground">{room.description}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ScrollArea className="h-[65vh] px-4">
                  <div className="space-y-4 pr-4">
                    <FormField
                      control={form.control}
                      name="image_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Image</FormLabel>
                          <FormControl>
                            <ImageUpload
                              imageUrl={field.value}
                              onUpload={(url) => field.onChange(url)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name*</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter item name" {...field} />
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
                              <Input placeholder="e.g., Paint, Flooring" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Additional form fields remain the same */}
                  </div>
                </ScrollArea>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createItem.isPending}
                >
                  {createItem.isPending ? "Creating..." : "Create Item"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex justify-between items-center py-2"
        >
          <span className="font-medium">Items ({items?.length || 0})</span>
          {isCollapsed ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronUp className="h-5 w-5" />
          )}
        </Button>

        <div className={cn(
          "grid md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-200",
          isCollapsed ? "hidden" : "block"
        )}>
          {items?.map((item) => (
            <ItemCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    </div>
  );
}