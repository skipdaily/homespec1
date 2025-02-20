import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Room } from "@shared/schema";
import { cn } from "@/lib/utils";

// Create a schema for the form that matches the database
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

interface Item {
  id: string;
  name: string;
  category: string;
  brand?: string;
  supplier?: string;
  specifications?: string;
  status?: string;
  warranty_info?: string;
  maintenance_notes?: string;
  installation_date?: string;
  cost?: number;
  version?: number; // Added for version history
  room_id?: string; // Added for invalidation
}

// ItemCard component to handle individual item state
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
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("No authenticated session found");
      }

      const { data, error } = await supabase
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
          image_url: values.image_url || null,
          document_urls: values.document_urls || []
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
          <h3 className="font-semibold">
            {item.name}
            {item.version > 1 && (
              <span className="ml-2 text-sm text-muted-foreground">
                (Version {item.version})
              </span>
            )}
          </h3>
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
        <div className="space-y-2 mt-4 pt-4 border-t">
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Brand name" {...field} />
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
                            <Input placeholder="Supplier name" {...field} />
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
                          <Textarea placeholder="Product specifications" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
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
                            <Textarea placeholder="Maintenance details" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                              placeholder="0.00"
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
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <FormControl>
                          <Input placeholder="Item status" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

interface RoomPageProps {
  id?: string;
}

export default function RoomPage({ id }: RoomPageProps) {
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

  const { data: room } = useQuery<Room>({
    queryKey: ["room", id],
    queryFn: async () => {
      if (!id) throw new Error("No room ID provided");

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: items } = useQuery({
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

  const createItem = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      if (!id || !room) throw new Error("No room ID provided");

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          throw new Error("No authenticated session found");
        }

        console.log("Attempting to insert item with:", {
          room_id: id,
          values: JSON.stringify(values, null, 2)
        });

        const { data, error } = await supabase
          .from("items")
          .insert([{
            room_id: id,
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
            image_url: values.image_url || null,
            document_urls: values.document_urls || []
          }])
          .select();

        if (error) {
          console.error("Supabase error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: JSON.stringify(error, null, 2)
          });
          throw error;
        }

        return data[0];
      } catch (error: any) {
        console.error("Error creating item:", {
          error,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          fullError: JSON.stringify(error, null, 2)
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{room.name}</h1>
          <p className="text-muted-foreground">{room.description}</p>
          {room.floor_number !== null && (
            <p className="text-sm text-muted-foreground">
              Floor: {room.floor_number}
            </p>
          )}
          {room.dimensions && (
            <p className="text-sm text-muted-foreground">
              Size: {room.dimensions}
            </p>
          )}
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
              <p className="text-sm text-muted-foreground">
                Add details about the item used in this room. Required fields are marked with *.
              </p>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ScrollArea className="h-[65vh] px-4">
                  <div className="space-y-4 pr-4">
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

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                              <Input placeholder="Brand name" {...field} />
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
                              <Input placeholder="Supplier name" {...field} />
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
                            <Textarea placeholder="Product specifications" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
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
                              <Textarea placeholder="Maintenance details" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                placeholder="0.00"
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
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <Input placeholder="Item status" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createItem.isPending}
                >
                  {createItem.isPending ? "Saving..." : "Save Item"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6">
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