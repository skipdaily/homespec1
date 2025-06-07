import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { type Item, type Image } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { useState } from "react";

interface ItemCardProps {
  item: Item;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showImageDialog, setShowImageDialog] = useState(false);

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

  return (
    <Card className="item-card-border transition-all duration-200 hover:shadow-lg">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold tracking-tight">{item.name}</h3>
            <Badge variant="secondary" className="capitalize">
              {item.category}
            </Badge>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {item.brand && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Brand</p>
              <p>{item.brand}</p>
            </div>
          )}
          {item.supplier && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supplier</p>
              <p>{item.supplier}</p>
            </div>
          )}
          {item.cost && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cost</p>
              <p>{formatCurrency(item.cost)}</p>
            </div>
          )}
          {item.installation_date && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Installed</p>
              <p>{new Date(item.installation_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Additional Details</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        <div
          className={cn(
            "space-y-4 overflow-hidden transition-all duration-200",
            isExpanded ? "max-h-[500px]" : "max-h-0"
          )}
        >
          {item.specifications && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Specifications
                </p>
                <p className="text-sm">{item.specifications}</p>
              </div>
            </>
          )}
          {item.warranty_info && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Warranty Information
                </p>
                <p className="text-sm">{item.warranty_info}</p>
              </div>
            </>
          )}
          {item.maintenance_notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Maintenance Notes
                </p>
                <p className="text-sm">{item.maintenance_notes}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/50 p-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">
            {images?.length || 0} Images
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}