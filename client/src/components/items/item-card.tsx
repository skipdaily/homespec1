import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { type Item, type Image } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Image as ImageIcon, ChevronLeft, ChevronRight, X, Pencil, Trash2, History, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ItemCardProps {
  item: Item;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Show more details by default
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
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      className="cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "group transition-all duration-200",
        "hover:shadow-lg hover:border-primary/20",
        "bg-gradient-to-br from-background to-muted",
        isExpanded && "ring-2 ring-primary/20"
      )}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="group-hover:text-primary transition-colors">{item.name}</CardTitle>
            <div className="flex space-x-2" onClick={e => e.stopPropagation()}>
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

        <CardContent>
          <AnimatePresence>
            <motion.div
              layout
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={cn("text-sm text-muted-foreground", getCategoryColor(item.category))}>
                {item.category}
              </div>

              {item.specifications && (
                <motion.div layout className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                  <div className="text-sm font-medium text-primary">Specifications</div>
                  <div className="text-sm text-muted-foreground">{item.specifications}</div>
                </motion.div>
              )}

              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {item.cost !== null && (
                  <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                    <div className="text-sm font-medium text-primary">Cost</div>
                    <div className="text-sm text-muted-foreground">
                      ${typeof item.cost === 'number' ? item.cost.toFixed(2) : item.cost}
                    </div>
                  </div>
                )}

                {item.warranty_info && (
                  <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                    <div className="text-sm font-medium text-primary">Warranty</div>
                    <div className="text-sm text-muted-foreground">{item.warranty_info}</div>
                  </div>
                )}
              </motion.div>

              {/* Images section */}
              {images && images.length > 0 && (
                <motion.div layout className="w-full">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {images.map((image) => (
                        <CarouselItem key={image.id}>
                          <div 
                            className="aspect-square relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(images.indexOf(image));
                              setShowFullscreenImage(true);
                            }}
                          >
                            <img
                              src={getImageUrl(image.storage_path)}
                              alt={`${item.name} image`}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </motion.div>
              )}

              {/* Additional details that show when expanded */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 pt-4 border-t"
                  >
                    {item.maintenance_notes && (
                      <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="text-sm font-medium text-primary">Maintenance Notes</div>
                        <div className="text-sm text-muted-foreground">{item.maintenance_notes}</div>
                      </div>
                    )}

                    {item.installation_date && (
                      <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="text-sm font-medium text-primary">Installation Date</div>
                        <div className="text-sm text-muted-foreground">{item.installation_date}</div>
                      </div>
                    )}

                    {item.link && (
                      <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="text-sm font-medium text-primary">External Link</div>
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.link}
                        </a>
                      </div>
                    )}

                    {item.notes && (
                      <div className="p-3 rounded-lg bg-card/50 hover:bg-card transition-colors">
                        <div className="text-sm font-medium text-primary">Additional Notes</div>
                        <div className="text-sm text-muted-foreground">{item.notes}</div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

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
    </motion.div>
  );
}