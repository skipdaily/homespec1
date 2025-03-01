import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { InsertItem, Image } from "@shared/schema";

interface ItemFormProps {
  roomId: string;
  onSuccess?: () => void;
}

export default function ItemForm({ roomId, onSuccess }: ItemFormProps) {
  const { toast } = useToast();

  const createItem = useMutation({
    mutationFn: async (data: InsertItem) => {
      const { error } = await supabase
        .from("items")
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items", roomId] });
      toast({
        title: "Success",
        description: "Item added successfully"
      });
      onSuccess?.();
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const costValue = formData.get("cost") as string;

    const item: InsertItem = {
      room_id: roomId,
      name: formData.get("name") as string,
      brand: formData.get("brand") as string || null,
      supplier: formData.get("supplier") as string || null,
      specifications: formData.get("specifications") as string || null,
      cost: costValue ? parseFloat(costValue) : null,
      warranty_info: formData.get("warranty_info") as string || null,
      category: formData.get("category") as string || "uncategorized",
      maintenance_notes: null,
      installation_date: null,
      status: 'pending',
      document_urls: []
    };

    createItem.mutate(item);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Item Name*</Label>
          <Input 
            id="name"
            name="name"
            placeholder="Enter item name"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input 
              id="brand"
              name="brand"
              placeholder="Enter brand name"
            />
          </div>
          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input 
              id="supplier"
              name="supplier"
              placeholder="Enter supplier name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="specifications">Specifications</Label>
          <Textarea
            id="specifications"
            name="specifications"
            placeholder="Enter item specifications"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cost">Cost</Label>
            <Input 
              id="cost"
              name="cost"
              type="number"
              step="0.01"
              placeholder="Enter cost"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input 
              id="category"
              name="category"
              placeholder="Enter category"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="warranty_info">Warranty Information</Label>
          <Textarea
            id="warranty_info"
            name="warranty_info"
            placeholder="Enter warranty information"
          />
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Images</h3>
          <p className="text-sm text-muted-foreground">Drag & drop images or click to upload</p>
        </div>
        <ImageUpload 
          itemId={roomId} 
          onUploadComplete={(images: Image[]) => {
            queryClient.invalidateQueries({ queryKey: ["item-images", roomId] });
          }} 
        />
      </div>

      <Button type="submit" className="w-full">
        Add Item
      </Button>
    </form>
  );
}