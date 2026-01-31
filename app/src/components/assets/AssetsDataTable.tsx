/**
 * Componente de tabla de datos para activos usando TanStack Table
 */

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { ArrowUpDown, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ExceptionApprovalDialog } from "./ExceptionApprovalDialog";

// Tipo extendido para incluir relaciones
export interface Asset {
  id: string;
  assetType: string;
  valueMxn: string;
  description: string | null;
  compliant: boolean;
  complianceStatus: string;
  beneficiary?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  actor?: {
    id: string;
    name: string | null;
    role: string;
  } | null;
  blockchainNetwork?: string | null;
}

interface AssetsDataTableProps {
  data: Asset[];
  total: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  isBeneficiario?: boolean;
  userRole?: string;
}

export function AssetsDataTable({
  data,
  total,
  currentPage,
  itemsPerPage,
  onPageChange,
  isBeneficiario = false,
  userRole,
}: AssetsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [approvalDialogOpen, setApprovalDialogOpen] = React.useState(false);
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);

  const getAssetTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GovernmentBond: 'Bono Gubernamental',
      MortgageLoan: 'Préstamo Hipotecario',
      InsuranceReserve: 'Reserva de Seguros',
      CNBVApproved: 'Valor CNBV',
      SocialHousing: 'Vivienda Social',
    };
    return labels[type] || type;
  };

  const columns: ColumnDef<Asset>[] = React.useMemo(
    () => [
      {
        accessorKey: "assetType",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 lg:px-3"
            >
              Tipo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const asset = row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{getAssetTypeLabel(asset.assetType)}</span>
              {asset.compliant ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "valueMxn",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 lg:px-3"
            >
              Valor
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const value = parseFloat(row.getValue("valueMxn"));
          return (
            <div className="text-right font-medium">
              ${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          );
        },
      },
      {
        accessorKey: "complianceStatus",
        header: "Estado",
        cell: ({ row }) => {
          const status = row.getValue("complianceStatus") as string;
          return (
            <span className={`font-semibold ${
              row.original.compliant ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {status}
            </span>
          );
        },
      },
      ...(isBeneficiario ? [] : [
        {
          accessorKey: "beneficiary",
          header: "Beneficiario",
          cell: ({ row }) => {
            const beneficiary = row.original.beneficiary;
            if (!beneficiary) return <span className="text-muted-foreground">-</span>;
            return (
              <span>{beneficiary.name || beneficiary.email || 'Sin nombre'}</span>
            );
          },
        } as ColumnDef<Asset>,
        {
          accessorKey: "actor",
          header: "Registrado por",
          cell: ({ row }) => {
            const actor = row.original.actor;
            if (!actor) return <span className="text-muted-foreground">-</span>;
            return <span>{actor.name || actor.role}</span>;
          },
        } as ColumnDef<Asset>,
      ]),
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const asset = row.original;
          const isComiteTecnico = userRole === 'COMITE_TECNICO';
          const isPendingReview = asset.complianceStatus === 'PENDING_REVIEW';

          return (
            <div className="flex items-center gap-2">
              {isComiteTecnico && isPendingReview && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setSelectedAsset(asset);
                      setApprovalDialogOpen(true);
                    }}
                    className="h-8"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Revisar
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link to={`/assets/${asset.id}`}>Ver</Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [isBeneficiario]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true, // Usamos paginación manual del servidor
    pageCount: Math.ceil(total / itemsPerPage),
  });

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <>
      {selectedAsset && (
        <ExceptionApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          assetId={selectedAsset.id}
          assetType={selectedAsset.assetType}
          valueMxn={selectedAsset.valueMxn}
          onSuccess={() => {
            setSelectedAsset(null);
          }}
        />
      )}
      <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, total)} de {total} activos
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}
      </div>
    </>
  );
}
