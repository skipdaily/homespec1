import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input 
        name="name"
        placeholder="Item Name*"
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input 
          name="brand"
          placeholder="Brand"
        />
        <Input 
          name="supplier"
          placeholder="Supplier"
        />
      </div>
      <Textarea
        name="specifications"
        placeholder="Specifications"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input 
          name="cost"
          type="number"
          step="0.01"
          placeholder="Cost"
        />
        <Input 
          name="category"
          placeholder="Category"
        />
      </div>
      <Textarea
        name="warranty_info"
        placeholder="Warranty Information"
      />
      <div className="space-y-2">
        <ImageUpload 
          itemId={roomId} 
          onUploadComplete={(images: Image[]) => {
            // Update UI or refresh data after images are uploaded
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