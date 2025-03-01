import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { type Item, type Image } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  // Query to fetch images for this item
  const { data: images } = useQuery<Image[]>({
    queryKey: ["item-images", item.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("item_id", item.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Function to get the public URL for an image
  const getImageUrl = (path: string) => {
    return supabase.storage.from("item-images").getPublicUrl(path).data.publicUrl;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {images && images.length > 0 && (
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((image) => (
                <CarouselItem key={image.id}>
                  <div className="aspect-square relative rounded-lg overflow-hidden">
                    <img
                      src={getImageUrl(image.storage_path)}
                      alt={image.description || item.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        )}

        {item.brand && (
          <div>
            <div className="text-sm font-medium">Brand</div>
            <div className="text-sm text-muted-foreground">{item.brand}</div>
          </div>
        )}

        {item.supplier && (
          <div>
            <div className="text-sm font-medium">Supplier</div>
            <div className="text-sm text-muted-foreground">{item.supplier}</div>
          </div>
        )}

        {item.specifications && (
          <div>
            <div className="text-sm font-medium">Specifications</div>
            <div className="text-sm text-muted-foreground">{item.specifications}</div>
          </div>
        )}

        {item.cost !== null && (
          <div>
            <div className="text-sm font-medium">Cost</div>
            <div className="text-sm text-muted-foreground">
              ${typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost}
            </div>
          </div>
        )}

        {item.category && (
          <div>
            <div className="text-sm font-medium">Category</div>
            <div className="text-sm text-muted-foreground">{item.category}</div>
          </div>
        )}

        {item.warranty_info && (
          <div>
            <div className="text-sm font-medium">Warranty Information</div>
            <div className="text-sm text-muted-foreground">{item.warranty_info}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}