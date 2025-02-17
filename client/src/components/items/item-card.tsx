import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type Item } from "@shared/schema";

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {item.cost && (
          <div>
            <div className="text-sm font-medium">Cost</div>
            <div className="text-sm text-muted-foreground">
              ${typeof item.cost === 'string' ? parseFloat(item.cost).toFixed(2) : item.cost.toFixed(2)}
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