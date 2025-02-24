import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

export default function PerformancePage() {
  // Query to get cost metrics by category
  const { data: costByCategory } = useQuery({
    queryKey: ["costByCategory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("category, cost");

      if (error) throw error;

      // Group and sum costs by category
      const categoryMap = data.reduce((acc, item) => {
        if (item.cost) {
          acc[item.category] = (acc[item.category] || 0) + Number(item.cost);
        }
        return acc;
      }, {} as Record<string, number>);

      // Convert to array format for charts
      return Object.entries(categoryMap).map(([category, cost]) => ({
        category,
        cost: Number(cost.toFixed(2))
      }));
    }
  });

  // Query to get total rooms and items count
  const { data: overviewStats } = useQuery({
    queryKey: ["overviewStats"],
    queryFn: async () => {
      const [roomsResult, itemsResult] = await Promise.all([
        supabase.from("rooms").select("count"),
        supabase.from("items").select("count")
      ]);

      if (roomsResult.error) throw roomsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return {
        totalRooms: roomsResult.count || 0,
        totalItems: itemsResult.count || 0
      };
    }
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Performance Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalRooms || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewStats?.totalItems || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Cost per Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costByCategory && costByCategory.length > 0
                ? (costByCategory.reduce((sum, item) => sum + item.cost, 0) / costByCategory.length).toFixed(2)
                : "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costByCategory
                ? costByCategory.reduce((sum, item) => sum + item.cost, 0).toFixed(2)
                : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost by Category Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Cost by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {costByCategory && costByCategory.length > 0 ? (
              <ChartContainer
                config={{
                  cost: {
                    theme: {
                      light: "hsl(var(--primary))",
                      dark: "hsl(var(--primary))"
                    }
                  }
                }}
              >
                <BarChart data={costByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip content={(props) => (
                    <ChartTooltipContent
                      {...props}
                      formatter={(value, name) => [`$${value}`, name]}
                    />
                  )} />
                  <Bar dataKey="cost" fill="var(--color-cost)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No cost data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
