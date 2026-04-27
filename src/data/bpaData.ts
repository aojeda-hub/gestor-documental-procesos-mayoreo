export interface Tarea {
  nombre: string;
}

export interface Actividad {
  nombre: string;
  tareas: Tarea[];
}

export interface Proceso {
  nombre: string;
  actividades: Actividad[];
}

export interface Grupo {
  nombre: string;
  procesos: Proceso[];
}

export interface Silo {
  nombre: string;
  grupos: Grupo[];
}

export interface Indicador {
  silo: string;
  grupo: string;
  proceso: string;
  titulo: string;
  estatus: 'Aprobado' | 'Desactualizado' | 'En Construcción' | 'Por Aprobar';
  version: number;
}

export interface DocumentoBPA {
  silo: string;
  grupo: string;
  proceso: string;
  actividad: string;
  documento: string;
  tipo: string;
  estatus: string;
}

export const bpaData: { silos: Silo[] } = {
  silos: [
    {
      nombre: "LOGÍSTICA",
      grupos: [
        {
          nombre: "CV",
          procesos: [
            {
              nombre: "Alisto y facturación",
              actividades: [
                { nombre: "Apartado de mercancía", tareas: [{ nombre: "Apartado" }] },
                { nombre: "Facturación", tareas: [{ nombre: "Facturación" }, { nombre: "Facturación Cofersa" }, { nombre: "Facturación MP" }, { nombre: "Facturacion Venezuela" }] },
                { nombre: "Alisto de pedidos", tareas: [{ nombre: "Alisto de pedidos" }, { nombre: "Verificación y cierre de pedidos" }] },
                { nombre: "Preparación y entrega de pedidos Taller", tareas: [{ nombre: "Preparación y entrega de pedidos Taller" }] },
                { nombre: "Despacho de pedidos", tareas: [{ nombre: "Etiquetado y preparación para despacho" }] }
              ]
            },
            {
              nombre: "Comercio Exterior",
              actividades: [
                { nombre: "Importación de mercancía", tareas: [{ nombre: "Digitalización Expedientes" }, { nombre: "Cálculo impuesto" }, { nombre: "Consolidación carga" }, { nombre: "Negociación Incoterms" }, { nombre: "Gestión seguros" }, { nombre: "Ingreso aduanero" }, { nombre: "Permisos arancelarios" }, { nombre: "Coordinación agentes" }, { nombre: "Revisión documentos" }, { nombre: "Despacho internamiento" }, { nombre: "Gestión riesgos" }] },
                { nombre: "Generación de Certificado de Origen", tareas: [{ nombre: "CO Venezuela" }, { nombre: "CO Costa Rica China" }, { nombre: "CO Costa Rica Colombia" }, { nombre: "CO Costa Rica Importado" }, { nombre: "CO Costa Rica CAFTA" }, { nombre: "CO Costa Rica DIAN" }, { nombre: "CO Costa Rica México" }] }
              ]
            },
            {
              nombre: "Despacho y Transporte",
              actividades: [
                { nombre: "Despacho de pedidos", tareas: [{ nombre: "Despacho" }, { nombre: "Procesos despacho" }, { nombre: "Guías despacho" }, { nombre: "Empaque" }, { nombre: "Pesaje" }, { nombre: "Palet despacho" }, { nombre: "Traslado zona despacho" }, { nombre: "Consolidación rutas" }, { nombre: "Predespacho" }, { nombre: "Despacho eflow WMS" }, { nombre: "Carga física" }] },
                { nombre: "Cliente retira", tareas: [{ nombre: "Cliente retira" }] },
                { nombre: "Entrega de pedidos", tareas: [{ nombre: "Liquidación viajes" }, { nombre: "Gestión transportistas" }, { nombre: "Cierre guía" }, { nombre: "Planificación rutas" }, { nombre: "Control entregas" }] },
                { nombre: "Transporte", tareas: [{ nombre: "Uso DM Fletes" }] }
              ]
            },
            {
              nombre: "Recepción y Almacenaje de Mercancía",
              actividades: [
                { nombre: "Liquidación de mercancía", tareas: [{ nombre: "Liquidación Importaciones" }, { nombre: "Liquidación Embarques Nacionales" }] },
                { nombre: "Manejo de garantías", tareas: [{ nombre: "Manejo Devoluciones y Dañados" }] },
                { nombre: "Almacenaje de mercancía", tareas: [{ nombre: "Múltiples bodegas" }, { nombre: "Reposición" }, { nombre: "Parámetros resurtido" }, { nombre: "Recepción" }, { nombre: "Asignación ubicaciones" }, { nombre: "Movimiento físico" }, { nombre: "Picking automático" }, { nombre: "Devolución sobrantes" }, { nombre: "Control alertas" }] },
                { nombre: "Devolución a Proveedor", tareas: [{ nombre: "Devolución Proveedor" }] },
                { nombre: "Devolución de mercancía clientes", tareas: [{ nombre: "Devolución cliente" }, { nombre: "Solicitudes cambios" }, { nombre: "Recepción devolución" }, { nombre: "Inspección" }, { nombre: "Reingreso inventario" }] },
                { nombre: "Recepción de mercancía", tareas: [{ nombre: "Manejo sobrantes" }, { nombre: "Verificación documental" }, { nombre: "Descarga" }, { nombre: "Etiquetado" }, { nombre: "Ingreso eflow" }, { nombre: "Control calidad" }] },
                { nombre: "Valor agregado", tareas: [{ nombre: "Etiquetado cliente" }, { nombre: "Maquila" }, { nombre: "Armado empaques" }] }
              ]
            },
            {
              nombre: "Atención al cliente",
              actividades: [
                { nombre: "Gestión de tiquetes", tareas: [{ nombre: "Gestión reclamos" }, { nombre: "Automatización servicio" }, { nombre: "Nivel servicio" }, { nombre: "Seguimiento casos" }, { nombre: "Cierre casos" }] },
                { nombre: "Revisión equipos garantía", tareas: [{ nombre: "Revisión taller" }] },
                { nombre: "Emisión boletas", tareas: [{ nombre: "Boletas manuales" }, { nombre: "Envío correo" }] }
              ]
            },
            {
              nombre: "Compra",
              actividades: [
                { nombre: "Reposición de inventarios", tareas: [{ nombre: "Reposición" }, { nombre: "Backorders" }, { nombre: "Seguimiento órdenes" }, { nombre: "Aprobación PO" }, { nombre: "Creación OC Streamline" }] },
                { nombre: "Pronóstico demanda", tareas: [{ nombre: "Pronóstico" }] },
                { nombre: "Compras MCG", tareas: [{ nombre: "Compras MCG" }, { nombre: "Proveedores MCG" }] }
              ]
            },
            {
              nombre: "Gestión de inventario",
              actividades: [
                { nombre: "Inventario Cíclico", tareas: [{ nombre: "Conteos cíclicos" }] },
                { nombre: "Inventario Anual", tareas: [{ nombre: "Toma física" }] }
              ]
            }
          ]
        },
        {
          nombre: "SOP",
          procesos: [
            {
              nombre: "Logística",
              actividades: [
                { nombre: "Logística 3PL", tareas: [{ nombre: "Seguimiento SLA" }, { nombre: "Análisis indicadores" }, { nombre: "Monitoreo KPIs" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: "PERSONAL",
      grupos: [
        {
          nombre: "SOP",
          procesos: [
            {
              nombre: "Captación",
              actividades: [
                { nombre: "Reclutamiento", tareas: [{ nombre: "Captación personal" }, { nombre: "Requisición personal" }, { nombre: "Publicación vacantes" }] },
                { nombre: "Selección", tareas: [{ nombre: "Entrevista" }, { nombre: "Pruebas psicotécnicas" }, { nombre: "Assessment Center" }, { nombre: "Examen preempleo" }, { nombre: "Oferta salarial" }] },
                { nombre: "Integración", tareas: [{ nombre: "Inducción" }, { nombre: "Uniforme" }, { nombre: "Comedor" }] }
              ]
            },
            {
              nombre: "Desarrollo",
              actividades: [
                { nombre: "Evaluación desempeño", tareas: [{ nombre: "Retroalimentación" }] },
                { nombre: "Formación", tareas: [{ nombre: "Capacitación" }, { nombre: "Pasantías" }] }
              ]
            },
            {
              nombre: "Administración de Personal",
              actividades: [
                { nombre: "Estructura organizacional", tareas: [{ nombre: "Descripción cargos" }] },
                { nombre: "Remuneración", tareas: [{ nombre: "Compensación" }, { nombre: "Escala salarial" }, { nombre: "Viáticos" }] },
                { nombre: "Beneficios", tareas: [{ nombre: "Vacaciones" }, { nombre: "Préstamos" }] }
              ]
            },
            {
              nombre: "Seguridad y salud laboral",
              actividades: [
                { nombre: "Diseño programa SSL", tareas: [{ nombre: "Plan SSL" }, { nombre: "EPP" }] },
                { nombre: "Ejecución", tareas: [{ nombre: "Reporte accidentes" }, { nombre: "Investigación" }, { nombre: "Primeros auxilios" }] },
                { nombre: "Seguridad física", tareas: [{ nombre: "Control acceso" }, { nombre: "Mantenimiento" }, { nombre: "CCTV" }, { nombre: "Alarma" }, { nombre: "Montacargas" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: "COMPRAS",
      grupos: [
        {
          nombre: "CV",
          procesos: [
            {
              nombre: "Definición de Surtido",
              actividades: [
                { nombre: "Detección necesidades mercado", tareas: [{ nombre: "Árbol de surtido" }, { nombre: "Clasificación BDF" }, { nombre: "Depuración surtido" }] }
              ]
            },
            {
              nombre: "Estudio de Factibilidad",
              actividades: [
                { nombre: "Análisis proveedores", tareas: [{ nombre: "Aprobación artículos" }, { nombre: "Evaluación proveedor" }, { nombre: "Creación artículos" }] },
                { nombre: "Análisis precios", tareas: [{ nombre: "Fijación precios" }, { nombre: "Lista precios" }, { nombre: "Actualización costos" }] }
              ]
            },
            {
              nombre: "Negociación con Proveedores",
              actividades: [
                { nombre: "Definición condiciones comerciales", tareas: [{ nombre: "Listas precios proveedores" }, { nombre: "Homologación" }, { nombre: "Contratos" }, { nombre: "Evaluación desempeño" }] }
              ]
            },
            {
              nombre: "Compra",
              actividades: [
                { nombre: "Análisis pedido", tareas: [{ nombre: "Código arancelario" }, { nombre: "Cálculo impuestos" }, { nombre: "Incoterms" }] },
                { nombre: "Seguimiento OC", tareas: [{ nombre: "Generación OC" }, { nombre: "Seguimiento cumplimiento" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: "VENTAS",
      grupos: [
        {
          nombre: "CV",
          procesos: [
            {
              nombre: "Administración de Clientes",
              actividades: [
                { nombre: "Captación nuevos clientes", tareas: [{ nombre: "Prospección" }, { nombre: "Apertura cliente" }] }
              ]
            },
            {
              nombre: "Administración de Ventas",
              actividades: [
                { nombre: "Definición incentivos y metas", tareas: [{ nombre: "Plan comercial" }, { nombre: "Presupuesto venta" }] },
                { nombre: "Administración estructura ventas", tareas: [{ nombre: "Planificación rutas" }, { nombre: "Televentas" }, { nombre: "Mapa reconocimiento" }] }
              ]
            },
            {
              nombre: "Negociación de Venta",
              actividades: [
                { nombre: "Emisión pedido ventas", tareas: [{ nombre: "Cotización" }, { nombre: "Pedidos Softland" }, { nombre: "Cotizador" }, { nombre: "Catálogo digital" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: "MERCADEO",
      grupos: [
        {
          nombre: "CV",
          procesos: [
            {
              nombre: "Gestión de Comunicación",
              actividades: [
                { nombre: "Comunicaciones internas", tareas: [{ nombre: "Plan marketing" }, { nombre: "Campañas" }, { nombre: "Material promocional" }, { nombre: "Eventos" }, { nombre: "ROI" }, { nombre: "Política marca" }] }
              ]
            },
            {
              nombre: "Gestión de Publicidad",
              actividades: [
                { nombre: "Publicidad digital", tareas: [{ nombre: "Redes sociales" }, { nombre: "Promociones" }, { nombre: "Investigación mercado" }] },
                { nombre: "Publicidad tradicional", tareas: [{ nombre: "Identidad corporativa" }, { nombre: "Segmentación clientes" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: "CONTROL",
      grupos: [
        {
          nombre: "SOP",
          procesos: [
            {
              nombre: "Ejecución y Control del Plan Financiero",
              actividades: [
                { nombre: "Control presupuesto", tareas: [{ nombre: "Administración deuda financiera" }] },
                { nombre: "Conciliaciones bancarias", tareas: [{ nombre: "Conciliación bancaria" }] },
                { nombre: "Cuentas por pagar", tareas: [{ nombre: "Mantenimiento proveedores" }, { nombre: "Viáticos" }] }
              ]
            },
            {
              nombre: "Gestión de Crédito y Cobranza",
              actividades: [
                { nombre: "Administración cobranzas", tareas: [{ nombre: "Cobranza extrajudicial" }, { nombre: "Conciliación" }, { nombre: "Cuentas incobrables" }] },
                { nombre: "Administración crediticia", tareas: [{ nombre: "Liberación pedidos" }, { nombre: "Líneas crédito" }] }
              ]
            },
            {
              nombre: "Control de Inventarios",
              actividades: [
                { nombre: "Ajustes inventario", tareas: [{ nombre: "Registro ajustes" }] },
                { nombre: "Toma física", tareas: [{ nombre: "Procedimiento inventario" }] }
              ]
            }
          ]
        }
      ]
    },
    {
      nombre: "PLANIFICACIÓN",
      grupos: [
        {
          nombre: "PL",
          procesos: [
            {
              nombre: "PL P01 - Formulación del plan estratégico",
              actividades: [
                { nombre: "Planeación estratégica", tareas: [{ nombre: "Definición objetivos" }, { nombre: "Análisis FODA" }, { nombre: "Mapa estratégico" }] }
              ]
            },
            {
              nombre: "PL P02 - Formulación del presupuesto operativo",
              actividades: [
                { nombre: "Elaboración presupuesto", tareas: [{ nombre: "Asignación partidas" }, { nombre: "Aprobación presupuesto" }] }
              ]
            },
            {
              nombre: "PL P03 - Monitoreo",
              actividades: [
                { nombre: "Seguimiento y control", tareas: [{ nombre: "Revisión trimestral" }, { nombre: "Indicadores gestión" }] }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Migrating dummy indicators
export const indicadoresData: Indicador[] = [
  { silo: "LOGÍSTICA", grupo: "CV", proceso: "Alisto y facturación", titulo: "Efectividad en recepción", estatus: "Desactualizado", version: 1 },
  { silo: "PERSONAL", grupo: "SOP", proceso: "Captación", titulo: "Rotación de Personal", estatus: "Aprobado", version: 1 },
  { silo: "LOGÍSTICA", grupo: "CV", proceso: "Recepción y Almacenaje de Mercancía", titulo: "Precisión de inventario", estatus: "Aprobado", version: 2 },
  { silo: "VENTAS", grupo: "CV", proceso: "Administración de Ventas", titulo: "Cumplimiento de cuota", estatus: "En Construcción", version: 1 }
];

// Migrating dummy documents
export const documentosData: DocumentoBPA[] = [
  { silo: "LOGÍSTICA", grupo: "CV", proceso: "Alisto y facturación", actividad: "Apartado de mercancía", documento: "Norma Apartado", tipo: "Norma", estatus: "Aprobado" },
  { silo: "PERSONAL", grupo: "SOP", proceso: "Captación", actividad: "Selección", documento: "Procedimiento de Contratación", tipo: "Procedimiento", estatus: "Aprobado" },
  { silo: "LOGÍSTICA", grupo: "CV", proceso: "Alisto y facturación", actividad: "Apartado de mercancía", documento: "Formato de Apartado", tipo: "Formato", estatus: "Desactualizado" }
];
