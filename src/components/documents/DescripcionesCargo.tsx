import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Briefcase, FileText, ExternalLink, MoreVertical, Eye, Pencil, FileDown, FileType2, Trash2, Upload } from 'lucide-react';
import type { Document } from '@/types/database';

const inventoryData = [
  { depto: "PROCESOS", cargo: "Jefe de Procesos", archivo: "DC-Jefe de Procesos.docx" },
  { depto: "PROCESOS", cargo: "Coordinador de Procesos", archivo: "DC-Coordinador de Procesos" },
  { depto: "PROCESOS", cargo: "Asesor de Procesos", archivo: "DC-Asesor de Procesos" },
  { depto: "MERCADEO", cargo: "Jefe de Mercadeo", archivo: "DC-Jefe de Mercadeo" },
  { depto: "MERCADEO", cargo: "Coordinador de Redes Sociales", archivo: "DC-Coordinador de Redes Sociales" },
  { depto: "MERCADEO", cargo: "Analista de Publicidad y Mercadeo", archivo: "DC-Analista de Publicidad y Mercadeo" },
  { depto: "MERCADEO", cargo: "Analista de Mercadeo", archivo: "" },
  { depto: "MERCADEO", cargo: "Analista de Diseño", archivo: "DC-Analista de Diseño" },
  { depto: "MERCADEO", cargo: "Especialista de Diseño", archivo: "" },
  { depto: "MERCADEO", cargo: "Coordinador de Diseño", archivo: "DC-Coordinador de Diseño" },
  { depto: "MERCADEO", cargo: "Analista de investigación de Mercadeo", archivo: "DC-Analista de Investigación de Mercadeo" },
  { depto: "MERCADEO", cargo: "Especialista de investigación de Mercadeo", archivo: "DC-Especialista de Investigación de Mercadeo" },
  { depto: "PERSONAL", cargo: "Gerente de Desarrollo Humano", archivo: "DC-Gerente de Desarrollo Humano" },
  { depto: "PERSONAL", cargo: "Gerente de Personal", archivo: "DC-Gerente de Personal" },
  { depto: "PERSONAL", cargo: "Jefe de Captación y Desarrollo", archivo: "DC-Jefe de Captación y Desarrollo.docx" },
  { depto: "PERSONAL", cargo: "Jefe De Personal", archivo: "DC-Jefe de Personal" },
  { depto: "PERSONAL", cargo: "Jefe de Compensación y Beneficio", archivo: "DC-Jefe de Compensación y Beneficios" },
  { depto: "PERSONAL", cargo: "Jefe de Seguridad y Salud Laboral", archivo: "DC-Jefe de Seguridad y Salud Laboral" },
  { depto: "PERSONAL", cargo: "Coordinador de Captación y desarrollo", archivo: "DC-Coordinador de Captación y Desarrollo" },
  { depto: "PERSONAL", cargo: "Coordinador de Compensación y beneficios", archivo: "DC-Coordinador de Compensación y Beneficios" },
  { depto: "PERSONAL", cargo: "Coordinador de Seguridad y salud laboral", archivo: "DC-Coordinador de Seguridad y Salud Laboral" },
  { depto: "PERSONAL", cargo: "Coordinador de Formación Técnica", archivo: "DC-Coordinador de Formación Técnica" },
  { depto: "PERSONAL", cargo: "Coordinador de Comunicaciones", archivo: "DC-Coordinador de Comunicaciones" },
  { depto: "PERSONAL", cargo: "Analista de personal (generalista)", archivo: "DC-Analista de personal" },
  { depto: "PERSONAL", cargo: "Analista de captación y desarrollo", archivo: "DC-Analista de Captación y Desarrollo" },
  { depto: "PERSONAL", cargo: "Analista de compensación y beneficios", archivo: "DC-Analista de Compensación y Beneficios" },
  { depto: "PERSONAL", cargo: "Analista de seguridad y salud laboral", archivo: "DC-Analista de Seguridad y Salud Laboral" },
  { depto: "PERSONAL", cargo: "Coordinador De Personal (generalista)", archivo: "DC-Coordinador de Personal" },
  { depto: "SISTEMAS", cargo: "Gerente de Sistemas", archivo: "DC-Gerente de Sistemas" },
  { depto: "SISTEMAS", cargo: "Coordinador de Inteligencia Comercial", archivo: "DC-Coordinador de Inteligencia Comercial" },
  { depto: "SISTEMAS", cargo: "Especialista en inteligencia IA", archivo: "DC-Especialista en Inteligencia IA" },
  { depto: "SISTEMAS", cargo: "Especialista en soluciones tecnológicas", archivo: "DC-Especialista en Soluciones Tecnológicas" },
  { depto: "SISTEMAS", cargo: "Especialista en Gestión de Datos", archivo: "DC-Especialista en Gestión de Datos" },
  { depto: "SISTEMAS", cargo: "Especialista de Inteligencia Comercial", archivo: "DC-Especialista en inteligencia Comercial" },
  { depto: "REPOSICIÓN", cargo: "Gerente de Transformación", archivo: "DC-Gerente de Transformación" },
  { depto: "REPOSICIÓN", cargo: "Jefe de Reposición", archivo: "DC-Jefe de Reposición" },
  { depto: "REPOSICIÓN", cargo: "Coordinador de Pronostico", archivo: "DC-Coordinador de Pronóstico" },
  { depto: "REPOSICIÓN", cargo: "Coordinador de Reposición", archivo: "DC-Coordinador de Reposición" },
  { depto: "REPOSICIÓN", cargo: "Especialista de Reposición", archivo: "DC-Especialista de Reposición" },
  { depto: "REPOSICIÓN", cargo: "Analista de Reposicion", archivo: "DC-Analista de Reposición" },
  { depto: "VENTAS", cargo: "Gerente de Ventas", archivo: "DC-Gerente de Ventas.docx" },
  { depto: "VENTAS", cargo: "Gerente regional de ventas", archivo: "DC-Gerente Regional de Ventas" },
  { depto: "VENTAS", cargo: "Jefe regional de Ventas", archivo: "DC-Jefe Regional de Ventas" },
  { depto: "VENTAS", cargo: "Supervisor de Ventas", archivo: "DC-Supervisor de ventas (marcas)" },
  { depto: "VENTAS", cargo: "Asesor de Ventas", archivo: "DC-Asesor de ventas (marcas)" },
  { depto: "VENTAS", cargo: "Promotor de Marca", archivo: "DC-Promotor de Marca" },
  { depto: "VENTAS", cargo: "Supervisor regional de ventas", archivo: "DC-Supervisor Regional de Ventas" },
  { depto: "VENTAS", cargo: "Vendedor Especializado", archivo: "DC-Asesor de ventas especializadas.docx" },
  { depto: "VENTAS", cargo: "Asesor comercial", archivo: "DC-Asesor de Ventas (Rol de Territorio).docx" },
  { depto: "VENTAS", cargo: "Supervisor de televentas", archivo: "DC-Supervisor de Televentas.docx" },
  { depto: "VENTAS", cargo: "Coord. administración de ventas", archivo: "DC-Coord Administración de Ventas.docx" },
  { depto: "VENTAS", cargo: "Asesor de ventas Cuentas Claves", archivo: "DC-Asesor de ventas Cuentas Clave.docx" },
  { depto: "VENTAS", cargo: "Supervisor de ventas Cuentas Claves", archivo: "" },
  { depto: "VENTAS", cargo: "Jefe de Ventas", archivo: "" },
  { depto: "VENTAS", cargo: "Asesor de ventas vacacionista", archivo: "DC-Vacacionista" },
  { depto: "VENTAS", cargo: "Asesor de Televentas", archivo: "DC-Asesor Comercial de Televentas.docx" },
  { depto: "VENTAS", cargo: "Analista de Trade Marketing", archivo: "DC-Analista de Trade Marketing" },
  { depto: "COMPRAS", cargo: "Gerente de Compras", archivo: "DC-Gerente de Compras" },
  { depto: "COMPRAS", cargo: "Gerente de Marca", archivo: "DC-Gerente de Marca" },
  { depto: "COMPRAS", cargo: "Gerente de Grupo de Marca", archivo: "DC-Gerente de grupo de Marca" },
  { depto: "COMPRAS", cargo: "Jefe de Compras", archivo: "DC-Jefe de Compras" },
  { depto: "COMPRAS", cargo: "Especialista Comercial", archivo: "DC-Especialista Comercial de Compras" },
  { depto: "COMPRAS", cargo: "Especialista de Marca", archivo: "DC-Especialista de Marca.docx" },
  { depto: "COMPRAS", cargo: "Analista De Compras", archivo: "DC-Analista de Compras.docx" },
  { depto: "CONTROL", cargo: "Gerente de Control", archivo: "Gerente de Control Mayoreo CR" },
  { depto: "CONTROL", cargo: "Jefe De Credito y Cobranza", archivo: "DC-Jefe de Crédito y Cobranza" },
  { depto: "CONTROL", cargo: "Jefe de Tesoreria", archivo: "DC-Jefe de Tesorería" },
  { depto: "CONTROL", cargo: "Coordinador De Credito y Cobranza", archivo: "DC-Coord. de Crédito y Cobro.docx" },
  { depto: "CONTROL", cargo: "Coordinador de Contabilidad", archivo: "DC-Coordinador de Contabilidad" },
  { depto: "CONTROL", cargo: "Coordinador de Cuentas por Pagar", archivo: "DC-Coord. de cuentas por pagar" },
  { depto: "CONTROL", cargo: "Especialista en Impuestos", archivo: "DC-Especialista en Impuestos" },
  { depto: "CONTROL", cargo: "Coordinador de Impuesto", archivo: "DC-Coordinador de Impuesto" },
  { depto: "CONTROL", cargo: "Coordinador De Nomina", archivo: "DC-Coordinador de Nomina" },
  { depto: "CONTROL", cargo: "Coordinador de Tesorería", archivo: "DC-Coordinador de Tesorería" },
  { depto: "CONTROL", cargo: "Jefe de Contabilidad", archivo: "DC-Jefe de Contabilidad" },
  { depto: "CONTROL", cargo: "Contador", archivo: "DC-Contador" },
  { depto: "CONTROL", cargo: "Adjunto Contador", archivo: "DC-Adjunto al Contador" },
  { depto: "CONTROL", cargo: "Analista de Contabilidad", archivo: "Analista de Contabilidad" },
  { depto: "CONTROL", cargo: "Analista de Crédito y Cobranza", archivo: "DC-Analista de Crédito y Cobro" },
  { depto: "CONTROL", cargo: "Abogado", archivo: "DC-Abogado" },
  { depto: "CONTROL", cargo: "Analista de Cuentas por Pagar", archivo: "DC-Analista de cuentas por pagar" },
  { depto: "CONTROL", cargo: "Coordinador de Revisoria", archivo: "DC-Coordinador de Revisoria" },
  { depto: "CONTROL", cargo: "Jefe de Revisoria", archivo: "DC-Jefe de Revisoría" },
  { depto: "CONTROL", cargo: "Analista De Revisoria Seccion ventas", archivo: "DC-Analista de Revisoría" },
  { depto: "CONTROL", cargo: "Coordinador de Revisoría - seccion ventas", archivo: "DC-Coordinador de Revisoría" },
  { depto: "CONTROL", cargo: "Analista de Tesorería", archivo: "DC-Analista de Tesorería" },
  { depto: "CONTROL", cargo: "Coordinador de Planificación Financiera", archivo: "DC-Coord. de Planificación Financiera" },
  { depto: "CONTROL", cargo: "Analista de planificacion financiera", archivo: "DC-Analista de planificación financiera" },
  { depto: "CONTROL", cargo: "Analista de Nomina", archivo: "DC-Analista de Nómina" },
  { depto: "LOGISTICA", cargo: "Gerente de logística", archivo: "DC-Gerente de Logística" },
  { depto: "LOGISTICA", cargo: "Gerente de transporte", archivo: "DC-Gerente de Transporte" },
  { depto: "LOGISTICA", cargo: "Jefe de Logistica", archivo: "Jefe de Logística" },
  { depto: "LOGISTICA", cargo: "Jefe de almacen", archivo: "DC-Jefe de Almacén" },
  { depto: "LOGISTICA", cargo: "Jefe de Transporte", archivo: "DC-Jefe de Transporte" },
  { depto: "LOGISTICA", cargo: "Coordinador de logística", archivo: "DC-Coordinador de Logística" },
  { depto: "LOGISTICA", cargo: "Supervisor de Almacén", archivo: "DC-Supervisor de Almacén" },
  { depto: "LOGISTICA", cargo: "Supervisor de Despacho", archivo: "DC-Supervisor de Despacho" },
  { depto: "LOGISTICA", cargo: "Coordinador de Almacen", archivo: "DC-Coordinador de Almacen" },
  { depto: "LOGISTICA", cargo: "Coordinador de Despacho", archivo: "DC-Coordinador de Despacho" },
  { depto: "LOGISTICA", cargo: "Supervisor de Material Pesado", archivo: "DC-Supervisor de Material Pesado" },
  { depto: "LOGISTICA", cargo: "Especialista Logístico", archivo: "DC-Especialista Logístico" },
  { depto: "LOGISTICA", cargo: "Asistente de logística", archivo: "DC-Asistente Logístico" },
  { depto: "LOGISTICA", cargo: "Asistente de Recepción", archivo: "DC-Asistente de Recepción" },
  { depto: "LOGISTICA", cargo: "Asistente de Almacén", archivo: "DC-Asistente de Almacén" },
  { depto: "LOGISTICA", cargo: "Asistente de Apartado", archivo: "DC-Asistente de Apartado" },
  { depto: "LOGISTICA", cargo: "Asistente de Chequeo", archivo: "DC-Asistente de Chequeo" },
  { depto: "LOGISTICA", cargo: "Asistente de Embalaje", archivo: "DC-Asistente de Embalaje" },
  { depto: "LOGISTICA", cargo: "Asistente de Facturación", archivo: "DC-Asistente de Facturación" },
  { depto: "LOGISTICA", cargo: "Asistente de Proyectos", archivo: "DC-Asistente de Proyectos" },
  { depto: "LOGISTICA", cargo: "Asistente de Material Pesado", archivo: "DC-Asistente de Material Pesado" },
  { depto: "LOGISTICA", cargo: "Asistente de Despacho", archivo: "DC-Asistente de Despacho" },
  { depto: "LOGISTICA", cargo: "Asistente de Torre", archivo: "DC-Asistente de Torre" },
  { depto: "LOGISTICA", cargo: "Coord de Repuestos e Inventario", archivo: "DC-Coord de Repuestos e Inventario Taller de Servicio" },
  { depto: "LOGISTICA", cargo: "Asistente de Transporte", archivo: "DC-Asistente de Transporte" },
  { depto: "LOGISTICA", cargo: "Asistente de Devoluciones", archivo: "DC-Asistente de Devoluciones" },
  { depto: "ADMINISTRACIÓN COMERCIAL", cargo: "Gerente Comercial", archivo: "DC-Gerente Comercial" },
  { depto: "ADMINISTRACIÓN COMERCIAL", cargo: "Jefe de Administración Comercial", archivo: "DC-Jefe de Administración Comercial" },
  { depto: "ADMINISTRACIÓN COMERCIAL", cargo: "Jefe De Logistica E Importación", archivo: "DC-Jefe de Logística e Importación" },
  { depto: "ADMINISTRACIÓN COMERCIAL", cargo: "Coordinador De Control de Inventario", archivo: "DC-Coordinador de Control de Inventario" },
  { depto: "ADMINISTRACIÓN COMERCIAL", cargo: "Analista de Control de Inventario", archivo: "DC-Analista de Control de Inventario" },
  { depto: "ADMINISTRACIÓN COMERCIAL", cargo: "Analista de Importaciones", archivo: "DC-Analista de Importaciones" },
  { depto: "SERVICIOS OPERACIONALES", cargo: "Jefe de Servicios Operacionales", archivo: "DC-Jefe de Servicios Operacionales" },
  { depto: "SERVICIOS OPERACIONALES", cargo: "Coordinador de Servicios Operacionales", archivo: "DC-Coordinador de Servicios Operacionales" },
  { depto: "SERVICIOS OPERACIONALES", cargo: "Analista de Servicios Operacionales", archivo: "DC-Analista de Servicios Operacionales" }
];

const departamentos = Array.from(new Set(inventoryData.map(item => item.depto)));

export interface DescripcionesCargoProps {
  docs: Document[];
  canEdit: boolean;
  onViewDoc: (doc: Document) => void;
  onEditDoc: (doc: Document) => void;
  onDeleteDoc: (doc: Document) => void;
  onDownload: (doc: Document, format: 'pdf' | 'word') => void;
  onUploadDoc?: (initialTitle?: string) => void;
}

export default function DescripcionesCargo({
  docs,
  canEdit,
  onViewDoc,
  onEditDoc,
  onDeleteDoc,
  onDownload,
  onUploadDoc
}: DescripcionesCargoProps) {
  const [selectedDepto, setSelectedDepto] = useState<string>("Todos");

  const filteredData = selectedDepto === "Todos" 
    ? inventoryData 
    : inventoryData.filter(item => item.depto === selectedDepto);

  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/\.docx?$/i, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[^a-z0-9]+/g, ''); // strip spaces, dashes, punctuation

  const getMatchedDoc = (archivoName: string) => {
    if (!archivoName) return null;
    const target = normalize(archivoName);
    if (!target) return null;
    return docs.find(doc => {
      const t = normalize(doc.title);
      return t === target || t.includes(target) || target.includes(t);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Descripciones de Cargo
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Directorio y acceso a documentos descriptivos por departamento.
          </p>
        </div>
        
        <div className="w-full sm:w-72">
          <Select value={selectedDepto} onValueChange={setSelectedDepto}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filtrar por departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos los departamentos</SelectItem>
              {departamentos.map(depto => (
                <SelectItem key={depto} value={depto}>{depto}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-1/3">Departamento</TableHead>
                  <TableHead className="w-1/3">Cargo</TableHead>
                  <TableHead className="w-1/3">Documento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No se encontraron cargos para este departamento.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, idx) => {
                    const matchedDoc = getMatchedDoc(item.archivo);
                    
                    return (
                      <TableRow key={idx} className="group hover:bg-accent/20">
                        <TableCell className="font-medium text-muted-foreground">
                          {item.depto}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {item.cargo}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-between">
                            {!item.archivo ? (
                              <span className="text-sm text-muted-foreground italic">Sin documento</span>
                            ) : matchedDoc ? (
                              <div className="flex items-center gap-2">
                                <span 
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => onViewDoc(matchedDoc)}
                                >
                                  <FileText className="h-4 w-4 text-primary/70" />
                                  {matchedDoc.title}
                                </span>
                                {matchedDoc.drive_link && (
                                  <a
                                    href={matchedDoc.drive_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 hover:underline px-1.5 py-0.5 rounded bg-green-500/5 hover:bg-green-500/10 transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Drive
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4 opacity-50" />
                                {item.archivo} <span className="text-[10px] uppercase bg-secondary px-1.5 py-0.5 rounded-sm opacity-70 ml-1">No subido</span>
                              </span>
                            )}

                            {/* Actions */}
                            {matchedDoc ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => onViewDoc(matchedDoc)}>
                                    <Eye className="h-4 w-4 mr-2" /> Ver
                                  </DropdownMenuItem>
                                  {canEdit && (
                                    <DropdownMenuItem onClick={() => onEditDoc(matchedDoc)}>
                                      <Pencil className="h-4 w-4 mr-2" /> Editar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => onDownload(matchedDoc, 'pdf')}>
                                    <FileDown className="h-4 w-4 mr-2" /> Descargar PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onDownload(matchedDoc, 'word')}>
                                    <FileType2 className="h-4 w-4 mr-2" /> Descargar Word
                                  </DropdownMenuItem>
                                  {canEdit && (
                                    <DropdownMenuItem
                                      onClick={() => onDeleteDoc(matchedDoc)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : canEdit && onUploadDoc ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUploadDoc && onUploadDoc(item.archivo ? item.archivo.replace(/\\.docx?$/i, '') : `DC-${item.cargo}`)}
                                className="h-8 gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                              >
                                <Upload className="h-3.5 w-3.5" /> Subir
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
