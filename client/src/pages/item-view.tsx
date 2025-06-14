import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  Download, 
  Eye, 
  FileText, 
  ImageIcon, 
  Calendar, 
  DollarSign,
  Package,
  Wrench,
  ExternalLink,
  History,
  Save,
  X
} from "lucide-react";
import { NavBreadcrumb } from "@/components/layout/nav-breadcrumb";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Item, ItemHistory, Image } from "@shared/schema";

// Form schema for editing
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
  link: z.string().url("Please enter a valid URL").optional().or(z.literal('')),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface ItemViewPageProps {
  id: string;
}

export default function ItemViewPage({ id }: ItemViewPageProps) {
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { toast } = useToast();

  // Fetch item data
  const { data: item, isLoading } = useQuery<Item & { rooms: { name: string; project_id: string } }>({
    queryKey: ["item", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select(`
          *,
          rooms (
            name,
            project_id
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch item images
  const { data: images = [] } = useQuery<Image[]>({
    queryKey: ["item-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("item_id", id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch item history
  const { data: itemHistory = [] } = useQuery<ItemHistory[]>({
    queryKey: ["item-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_history")
        .select("*")
        .eq("item_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Initialize form
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: item?.name || "",
      brand: item?.brand || "",
      supplier: item?.supplier || "",
      specifications: item?.specifications || "",
      cost: item?.cost ? parseFloat(item.cost) : undefined,
      warranty_info: item?.warranty_info || "",
      maintenance_notes: item?.maintenance_notes || "",
      installation_date: item?.installation_date || "",
      category: item?.category || "",
      status: item?.status || "",
      link: item?.link || "",
      notes: item?.notes || "",
    },
  });

  // Update form when item data loads
  useState(() => {
    if (item) {
      form.reset({
        name: item.name,
        brand: item.brand || "",
        supplier: item.supplier || "",
        specifications: item.specifications || "",
        cost: item.cost ? parseFloat(item.cost) : undefined,
        warranty_info: item.warranty_info || "",
        maintenance_notes: item.maintenance_notes || "",
        installation_date: item.installation_date || "",
        category: item.category,
        status: item.status || "",
        link: item.link || "",
        notes: item.notes || "",
      });
    }
  });

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async (values: ItemFormValues) => {
      const timestamp = new Date().toISOString();

      // Insert current state into history first
      if (item) {
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
            document_urls: item.document_urls,
            link: item.link,
            notes: item.notes,
            created_at: timestamp,
            updated_at: timestamp
          }]);

        if (historyError) throw historyError;
      }

      // Update the item
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
          link: values.link || null,
          notes: values.notes || null,
          updated_at: timestamp
        })
        .eq('id', id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      queryClient.invalidateQueries({ queryKey: ["item-history", id] });
      setIsEditing(false);
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

  const handleSubmit = (values: ItemFormValues) => {
    updateItem.mutate(values);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "Item link has been copied to clipboard"
    });
    setShowShareDialog(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'electrical': 'bg-yellow-100 text-yellow-800',
      'plumbing': 'bg-blue-100 text-blue-800',
      'flooring': 'bg-green-100 text-green-800',
      'lighting': 'bg-purple-100 text-purple-800',
      'appliances': 'bg-red-100 text-red-800',
      'fixtures': 'bg-indigo-100 text-indigo-800',
    };
    return colors[category?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Item Not Found</h1>
        <Button onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/room/${item.room_id}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Room
              </Button>
              <NavBreadcrumb 
                items={[
                  { href: "/dashboard", label: "Dashboard" },
                  { href: `/room/${item.room_id}`, label: item.rooms?.name || "Room" },
                  { label: item.name }
                ]}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-4 w-4 mr-2" />
                History
              </Button>
              
              <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Share Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Share this item with others by copying the link below:
                    </p>
                    <div className="flex items-center space-x-2">
                      <Input
                        value={window.location.href}
                        readOnly
                        className="flex-1"
                      />
                      <Button onClick={handleShare}>
                        Copy Link
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={updateItem.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateItem.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Item
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Item Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    {isEditing ? (
                      <Form {...form}>
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  {...field}
                                  className="text-2xl font-bold border-none p-0 h-auto bg-transparent"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </Form>
                    ) : (
                      <CardTitle className="text-2xl">{item.name}</CardTitle>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
                      {item.status && (
                        <Badge variant="secondary">{item.status}</Badge>
                      )}
                    </div>
                  </div>
                  
                  {item.cost && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {formatCurrency(item.cost)}
                      </div>
                      <div className="text-sm text-gray-500">Total Cost</div>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Images */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2" />
                    Images ({images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {images.map((image) => (
                        <CarouselItem key={image.id} className="md:basis-1/2 lg:basis-1/3">
                          <div className="p-1">
                            <Card>
                              <CardContent className="flex aspect-square items-center justify-center p-2">
                                <img
                                  src={`${supabase.storage.from('item-images').getPublicUrl(image.storage_path).data.publicUrl}`}
                                  alt={image.filename}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Item Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  <Form {...form}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter brand" />
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
                              <Input {...field} placeholder="Enter supplier" />
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
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter category" />
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
                                {...field}
                                type="number"
                                step="0.01"
                                placeholder="Enter cost"
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                              <Input {...field} type="date" />
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
                              <Input {...field} placeholder="Enter status" />
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
                            <Textarea {...field} placeholder="Enter specifications" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="warranty_info"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Information</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter warranty information" />
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
                            <Textarea {...field} placeholder="Enter maintenance notes" />
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
                          <FormLabel>Product Link</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter product URL" />
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
                            <Textarea {...field} placeholder="Enter additional notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {item.brand && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Brand</Label>
                          <p className="mt-1">{item.brand}</p>
                        </div>
                      )}
                      
                      {item.supplier && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Supplier</Label>
                          <p className="mt-1">{item.supplier}</p>
                        </div>
                      )}
                      
                      {item.installation_date && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Installation Date</Label>
                          <p className="mt-1">{formatDate(item.installation_date)}</p>
                        </div>
                      )}
                      
                      {item.link && (
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Product Link</Label>
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-blue-600 hover:text-blue-800 underline flex items-center"
                          >
                            View Product
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {item.specifications && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Specifications</Label>
                        <p className="mt-1 whitespace-pre-wrap">{item.specifications}</p>
                      </div>
                    )}
                    
                    {item.warranty_info && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Warranty Information</Label>
                        <p className="mt-1 whitespace-pre-wrap">{item.warranty_info}</p>
                      </div>
                    )}
                    
                    {item.maintenance_notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Maintenance Notes</Label>
                        <p className="mt-1 whitespace-pre-wrap">{item.maintenance_notes}</p>
                      </div>
                    )}
                    
                    {item.notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Additional Notes</Label>
                        <p className="mt-1 whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500">Category</span>
                  </div>
                  <Badge className={getCategoryColor(item.category)} variant="secondary">
                    {item.category}
                  </Badge>
                </div>
                
                {item.cost && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500">Cost</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.cost)}</span>
                  </div>
                )}
                
                {item.installation_date && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm text-gray-500">Installed</span>
                    </div>
                    <span className="text-sm">{formatDate(item.installation_date)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ImageIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-500">Images</span>
                  </div>
                  <span className="text-sm">{images.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  View History ({itemHistory.length})
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowShareDialog(true)}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Item
                </Button>
                
                {item.link && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => item.link && window.open(item.link, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Product
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Item History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {itemHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No history available</p>
            ) : (
              itemHistory.map((historyItem, index) => (
                <Card key={historyItem.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Version {itemHistory.length - index}
                      </CardTitle>
                      <span className="text-sm text-gray-500">
                        {formatDate(historyItem.created_at)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {historyItem.name}
                      </div>
                      {historyItem.brand && (
                        <div>
                          <span className="font-medium">Brand:</span> {historyItem.brand}
                        </div>
                      )}
                      {historyItem.cost && (
                        <div>
                          <span className="font-medium">Cost:</span> {formatCurrency(historyItem.cost)}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Category:</span> {historyItem.category}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
