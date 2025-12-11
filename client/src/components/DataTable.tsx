import { useState, useCallback } from "react";
import { ArrowUpDown, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ALL_FIELD_NAMES, type FieldName, type ParsedRecord } from "@shared/schema";

interface DataTableProps {
  data: ParsedRecord[];
  onDataChange: (data: ParsedRecord[]) => void;
}

type SortDirection = "asc" | "desc" | null;

interface EditingCell {
  rowIndex: number;
  field: FieldName;
  value: string;
}

export function DataTable({ data, onDataChange }: DataTableProps) {
  const [sortField, setSortField] = useState<FieldName | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const handleSort = useCallback((field: FieldName) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const sortedData = [...data].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;
    const aVal = a[sortField] || "";
    const bVal = b[sortField] || "";
    const comparison = aVal.localeCompare(bVal);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleStartEdit = useCallback((rowIndex: number, field: FieldName, value: string) => {
    setEditingCell({ rowIndex, field, value });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;

    const newData = [...data];
    const originalIndex = data.findIndex(
      (_, i) => sortedData[editingCell.rowIndex] === data[i]
    );
    if (originalIndex !== -1) {
      newData[originalIndex] = {
        ...newData[originalIndex],
        [editingCell.field]: editingCell.value,
      };
      onDataChange(newData);
    }
    setEditingCell(null);
  }, [editingCell, data, sortedData, onDataChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center border rounded-md"
        data-testid="empty-data-table"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Edit2 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          No parsed data yet. Process images to populate this table.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md" data-testid="data-table">
      <ScrollArea className="w-full">
        <div className="min-w-max">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="w-10 text-center sticky left-0 bg-card z-20">
                  #
                </TableHead>
                {ALL_FIELD_NAMES.map((field) => (
                  <TableHead
                    key={field}
                    className="min-w-32 whitespace-nowrap"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 -ml-2 font-medium"
                      onClick={() => handleSort(field)}
                      data-testid={`button-sort-${field}`}
                    >
                      {field}
                      <ArrowUpDown
                        className={cn(
                          "ml-1 h-3 w-3",
                          sortField === field ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((row, rowIndex) => (
                <TableRow
                  key={row.ImageName + row.RecordNo}
                  className="group"
                  data-testid={`table-row-${rowIndex}`}
                >
                  <TableCell className="text-center text-muted-foreground sticky left-0 bg-background group-hover:bg-muted/50 transition-colors">
                    {rowIndex + 1}
                  </TableCell>
                  {ALL_FIELD_NAMES.map((field) => {
                    const isEditing =
                      editingCell?.rowIndex === rowIndex &&
                      editingCell?.field === field;

                    return (
                      <TableCell
                        key={field}
                        className="group/cell relative"
                        data-testid={`cell-${rowIndex}-${field}`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({
                                  ...editingCell,
                                  value: e.target.value,
                                })
                              }
                              onKeyDown={handleKeyDown}
                              className="h-7 text-sm"
                              autoFocus
                              data-testid={`input-edit-${rowIndex}-${field}`}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleSaveEdit}
                              data-testid={`button-save-${rowIndex}-${field}`}
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleCancelEdit}
                              data-testid={`button-cancel-${rowIndex}-${field}`}
                            >
                              <X className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 -m-2 p-2 rounded"
                            onClick={() =>
                              handleStartEdit(rowIndex, field, row[field] || "")
                            }
                          >
                            <span
                              className={cn(
                                "text-sm truncate max-w-48",
                                !row[field] && "text-muted-foreground italic"
                              )}
                              title={row[field] || undefined}
                            >
                              {row[field] || "(empty)"}
                            </span>
                            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0" />
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
