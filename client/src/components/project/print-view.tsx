import { QRCodeSVG } from "qrcode.react";
import type { Project, Room } from "@shared/schema";

interface PrintViewProps {
  project: Project;
  rooms: Room[];
  itemCounts: Record<string, number>;
  baseUrl: string;
  items?: any[]; // Add items to props
}

export default function PrintView({ project, rooms, itemCounts, baseUrl, items = [] }: PrintViewProps) {
  const projectUrl = `${baseUrl}/project/${project.id}`;

  return (
    <div className="p-8 max-w-4xl mx-auto print:mx-0 print:max-w-none print:p-0">
      {/* Project Header */}
      <div className="flex justify-between items-start mb-8 print:mb-6">
        <div>
          <h1 className="text-4xl font-bold">{project.name}</h1>
          <p className="text-xl text-muted-foreground mt-2">{project.address}</p>
          <p className="text-lg text-muted-foreground">Builder: {project.builder_name}</p>
          {project.completion_date && (
            <p className="text-lg text-muted-foreground">
              Expected Completion: {new Date(project.completion_date).toLocaleDateString()}
            </p>
          )}
          {project.created_at && (
            <p className="text-sm text-muted-foreground">
              Created: {new Date(project.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="text-center">
          <QRCodeSVG value={projectUrl} size={120} />
          <p className="text-sm text-muted-foreground mt-2">Scan to view project</p>
        </div>
      </div>

      {/* Areas and Items */}
      <div className="space-y-8 print:space-y-6">
        {rooms.map((room) => {
          const roomItems = items.filter(item => item.room_id === room.id);

          return (
            <div key={room.id} className="border-t pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-semibold">{room.name}</h2>
                  {room.description && (
                    <p className="text-muted-foreground mt-2">{room.description}</p>
                  )}
                </div>
                <div className="text-right">
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
                  <p className="text-sm text-muted-foreground">
                    Items: {itemCounts[room.id] || 0}
                  </p>
                </div>
              </div>

              {/* Items in this area */}
              {roomItems.length > 0 && (
                <div className="mt-4 space-y-4">
                  <h3 className="text-lg font-medium">Items</h3>
                  <div className="grid gap-3">
                    {roomItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4 bg-muted/10">
                        <div className="flex justify-between">
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Category: {item.category}
                            </p>
                          </div>
                          {item.brand && (
                            <p className="text-sm text-muted-foreground">
                              Brand: {item.brand}
                            </p>
                          )}
                        </div>
                        {item.specifications && (
                          <p className="text-sm mt-2">{item.specifications}</p>
                        )}
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                          {item.supplier && (
                            <p>Supplier: {item.supplier}</p>
                          )}
                          {item.cost && (
                            <p>Cost: ${item.cost}</p>
                          )}
                          {item.installation_date && (
                            <p>Installed: {new Date(item.installation_date).toLocaleDateString()}</p>
                          )}
                          {item.warranty_info && (
                            <p>Warranty: {item.warranty_info}</p>
                          )}
                        </div>
                        {item.maintenance_notes && (
                          <p className="text-sm mt-2 text-muted-foreground">
                            Maintenance: {item.maintenance_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground print:fixed print:bottom-4 print:left-0 print:right-0">
        Generated from HomeSpec on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}