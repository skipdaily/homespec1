import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { type Item, type Image } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, ChevronLeft, ChevronRight, X, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ItemCardProps {
  item: Item;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? (images?.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === (images?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  // Get category color based on type
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'appliance': 'bg-blue-100 text-blue-800',
      'furniture': 'bg-green-100 text-green-800',
      'electronics': 'bg-purple-100 text-purple-800',
      'lighting': 'bg-yellow-100 text-yellow-800',
      'plumbing': 'bg-cyan-100 text-cyan-800',
      'flooring': 'bg-orange-100 text-orange-800',
      'hardware': 'bg-red-100 text-red-800'
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="group transition-all duration-200 hover:shadow-lg hover:border-primary/20 bg-gradient-to-br from-background to-muted">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="group-hover:text-primary transition-colors">{item.name}</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowImageDialog(true)}
              className="h-8 w-8 hover:text-primary hover:bg-primary/10"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-8 w-8 hover:text-primary hover:bg-primary/10"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {item.brand && (
            <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
              <div className="text-sm font-medium text-primary">Brand</div>
              <div className="text-sm text-muted-foreground">{item.brand}</div>
            </div>
          )}

          {item.supplier && (
            <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
              <div className="text-sm font-medium text-primary">Supplier</div>
              <div className="text-sm text-muted-foreground">{item.supplier}</div>
            </div>
          )}

          {item.specifications && (
            <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
              <div className="text-sm font-medium text-primary">Specifications</div>
              <div className="text-sm text-muted-foreground">{item.specifications}</div>
            </div>
          )}

          {item.cost !== null && (
            <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
              <div className="text-sm font-medium text-primary">Cost</div>
              <div className="text-sm text-muted-foreground">
                ${typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost}
              </div>
            </div>
          )}

          {item.category && (
            <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
              <div className="text-sm font-medium text-primary">Category</div>
              <div className={cn("text-sm px-2 py-1 rounded-md inline-block mt-1", getCategoryColor(item.category))}>
                {item.category}
              </div>
            </div>
          )}

          {item.warranty_info && (
            <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
              <div className="text-sm font-medium text-primary">Warranty Information</div>
              <div className="text-sm text-muted-foreground">{item.warranty_info}</div>
            </div>
          )}
        </div>

        {/* Image Carousel */}
        {images && images.length > 0 && (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={image.id}>
                    <div 
                      className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setShowFullscreenImage(true);
                      }}
                    >
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
          </div>
        )}
      </CardContent>

      {/* Image Upload Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Images - {item.name}</DialogTitle>
          </DialogHeader>
          <ImageUpload 
            itemId={item.id} 
            onUploadComplete={() => {
              setShowImageDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      {images && images.length > 0 && (
        <Dialog open={showFullscreenImage} onOpenChange={setShowFullscreenImage}>
          <DialogContent className="max-w-7xl max-h-[90vh] p-0 gap-0">
            <div className="relative h-full">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-50"
                onClick={() => setShowFullscreenImage(false)}
              >
                <X className="h-6 w-6" />
              </Button>

              <div className="relative aspect-square">
                <img
                  src={getImageUrl(images[currentImageIndex].storage_path)}
                  alt={images[currentImageIndex].description || item.name}
                  className="object-contain w-full h-full"
                />
              </div>

              <div className="absolute inset-y-0 left-0 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-background/80 backdrop-blur"
                  onClick={handlePrevImage}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full bg-background/80 backdrop-blur"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground">
                {currentImageIndex + 1} of {images.length}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}