import { QRCodeSVG } from "qrcode.react";
import type { Project, Room } from "@shared/schema";

interface PrintViewProps {
  project: Project;
  rooms: Room[];
  itemCounts: Record<string, number>;
  baseUrl: string;
}

export default function PrintView({ project, rooms, itemCounts, baseUrl }: PrintViewProps) {
  const projectUrl = `${baseUrl}/project/${project.id}`;

  return (
    <div className="p-8 max-w-4xl mx-auto print:mx-0 print:max-w-none print:p-0">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold">{project.name}</h1>
          <p className="text-xl text-muted-foreground mt-2">{project.address}</p>
          <p className="text-lg text-muted-foreground">Builder: {project.builder_name}</p>
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

      <div className="space-y-8">
        {rooms.map((room) => (
          <div key={room.id} className="border-t pt-6">
            <h2 className="text-2xl font-semibold">{room.name}</h2>
            {room.description && (
              <p className="text-muted-foreground mt-2">{room.description}</p>
            )}
            <div className="flex gap-4 mt-2">
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
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground print:fixed print:bottom-4 print:left-0 print:right-0">
        Generated from HomeSpec on {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
