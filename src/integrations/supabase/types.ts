export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      companias: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          orden: number
          slug: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          orden?: number
          slug: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          orden?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_indicators: {
        Row: {
          document_id: string
          id: string
          indicator_id: string
        }
        Insert: {
          document_id: string
          id?: string
          indicator_id: string
        }
        Update: {
          document_id?: string
          id?: string
          indicator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_indicators_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_indicators_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          approver: string | null
          authors: string | null
          created_at: string
          description: string | null
          document_id: string
          id: string
          is_current: boolean
          url_file: string | null
          url_pdf: string | null
          url_word: string | null
          version_number: number
        }
        Insert: {
          approver?: string | null
          authors?: string | null
          created_at?: string
          description?: string | null
          document_id: string
          id?: string
          is_current?: boolean
          url_file?: string | null
          url_pdf?: string | null
          url_word?: string | null
          version_number: number
        }
        Update: {
          approver?: string | null
          authors?: string | null
          created_at?: string
          description?: string | null
          document_id?: string
          id?: string
          is_current?: boolean
          url_file?: string | null
          url_pdf?: string | null
          url_word?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          categoria: string | null
          clasificacion: string | null
          drive_id_original: string | null
          eliminado: boolean | null
          fecha_actualizacion: string | null
          fecha_eliminacion: string | null
          fecha_ingesta: string | null
          hash_sha256: string | null
          id: string
          metadata_original: Json | null
          nombre: string
          origen_ingesta: string | null
          propietario_sistema: boolean | null
          silo: string | null
          storage_bucket: string
          storage_path: string | null
          tamano_bytes: number | null
          tipo: string | null
          tipo_mime: string | null
          usuario_id: string | null
        }
        Insert: {
          categoria?: string | null
          clasificacion?: string | null
          drive_id_original?: string | null
          eliminado?: boolean | null
          fecha_actualizacion?: string | null
          fecha_eliminacion?: string | null
          fecha_ingesta?: string | null
          hash_sha256?: string | null
          id?: string
          metadata_original?: Json | null
          nombre: string
          origen_ingesta?: string | null
          propietario_sistema?: boolean | null
          silo?: string | null
          storage_bucket?: string
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo?: string | null
          tipo_mime?: string | null
          usuario_id?: string | null
        }
        Update: {
          categoria?: string | null
          clasificacion?: string | null
          drive_id_original?: string | null
          eliminado?: boolean | null
          fecha_actualizacion?: string | null
          fecha_eliminacion?: string | null
          fecha_ingesta?: string | null
          hash_sha256?: string | null
          id?: string
          metadata_original?: Json | null
          nombre?: string
          origen_ingesta?: string | null
          propietario_sistema?: boolean | null
          silo?: string | null
          storage_bucket?: string
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo?: string | null
          tipo_mime?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      documentos_metadata: {
        Row: {
          carpeta: string | null
          created_at: string | null
          id: string
          nombre_almacenado: string
          nombre_original: string
          ruta_storage: string
          tamano_bytes: number
          tipo_mime: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          carpeta?: string | null
          created_at?: string | null
          id?: string
          nombre_almacenado: string
          nombre_original: string
          ruta_storage: string
          tamano_bytes: number
          tipo_mime: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          carpeta?: string | null
          created_at?: string | null
          id?: string
          nombre_almacenado?: string
          nombre_original?: string
          ruta_storage?: string
          tamano_bytes?: number
          tipo_mime?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          confidential: boolean
          created_at: string
          created_by: string | null
          doc_type: Database["public"]["Enums"]["doc_type"]
          drive_link: string | null
          empresa: Database["public"]["Enums"]["empresa_type"]
          id: string
          silo: Database["public"]["Enums"]["silo_type"]
          title: string
          updated_at: string
        }
        Insert: {
          confidential?: boolean
          created_at?: string
          created_by?: string | null
          doc_type: Database["public"]["Enums"]["doc_type"]
          drive_link?: string | null
          empresa?: Database["public"]["Enums"]["empresa_type"]
          id?: string
          silo: Database["public"]["Enums"]["silo_type"]
          title: string
          updated_at?: string
        }
        Update: {
          confidential?: boolean
          created_at?: string
          created_by?: string | null
          doc_type?: Database["public"]["Enums"]["doc_type"]
          drive_link?: string | null
          empresa?: Database["public"]["Enums"]["empresa_type"]
          id?: string
          silo?: Database["public"]["Enums"]["silo_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      incidencia_imagenes: {
        Row: {
          created_at: string
          id: string
          incidencia_id: string
          nombre_original: string | null
          orden: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          incidencia_id: string
          nombre_original?: string | null
          orden?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          incidencia_id?: string
          nombre_original?: string | null
          orden?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencia_imagenes_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "incidencias"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencias: {
        Row: {
          codigo_transaccion: string | null
          created_at: string
          created_by: string | null
          descripcion: string
          estado: Database["public"]["Enums"]["incidencia_estado"]
          fecha: string
          fecha_completado: string | null
          fecha_ocurrencia: string | null
          id: string
          modulo: Database["public"]["Enums"]["modulo_erp"]
          nombre_transaccion: string | null
          numero: number
          prioridad: Database["public"]["Enums"]["incidencia_prioridad"]
          proyecto_id: string | null
          responsable: string | null
          sistema_nombre: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          codigo_transaccion?: string | null
          created_at?: string
          created_by?: string | null
          descripcion: string
          estado?: Database["public"]["Enums"]["incidencia_estado"]
          fecha?: string
          fecha_completado?: string | null
          fecha_ocurrencia?: string | null
          id?: string
          modulo: Database["public"]["Enums"]["modulo_erp"]
          nombre_transaccion?: string | null
          numero?: number
          prioridad?: Database["public"]["Enums"]["incidencia_prioridad"]
          proyecto_id?: string | null
          responsable?: string | null
          sistema_nombre?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          codigo_transaccion?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string
          estado?: Database["public"]["Enums"]["incidencia_estado"]
          fecha?: string
          fecha_completado?: string | null
          fecha_ocurrencia?: string | null
          id?: string
          modulo?: Database["public"]["Enums"]["modulo_erp"]
          nombre_transaccion?: string | null
          numero?: number
          prioridad?: Database["public"]["Enums"]["incidencia_prioridad"]
          proyecto_id?: string | null
          responsable?: string | null
          sistema_nombre?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          action_plan: string | null
          created_at: string
          created_by: string | null
          data_source: string | null
          definition: string | null
          formula: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          goals: string | null
          id: string
          indicator_type: Database["public"]["Enums"]["indicator_type"]
          name: string
          related_process: string | null
          responsible: string | null
          silo: Database["public"]["Enums"]["silo_type"]
          unit: string | null
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          definition?: string | null
          formula?: string | null
          frequency: Database["public"]["Enums"]["frequency_type"]
          goals?: string | null
          id?: string
          indicator_type: Database["public"]["Enums"]["indicator_type"]
          name: string
          related_process?: string | null
          responsible?: string | null
          silo: Database["public"]["Enums"]["silo_type"]
          unit?: string | null
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          created_at?: string
          created_by?: string | null
          data_source?: string | null
          definition?: string | null
          formula?: string | null
          frequency?: Database["public"]["Enums"]["frequency_type"]
          goals?: string | null
          id?: string
          indicator_type?: Database["public"]["Enums"]["indicator_type"]
          name?: string
          related_process?: string | null
          responsible?: string | null
          silo?: Database["public"]["Enums"]["silo_type"]
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      normas_personal: {
        Row: {
          activo: boolean | null
          descripcion: string | null
          fecha_creacion: string | null
          id: number
          nombre_norma: string
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          descripcion?: string | null
          fecha_creacion?: string | null
          id?: number
          nombre_norma: string
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          descripcion?: string | null
          fecha_creacion?: string | null
          id?: number
          nombre_norma?: string
          tipo?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          silo: Database["public"]["Enums"]["silo_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          silo?: Database["public"]["Enums"]["silo_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          silo?: Database["public"]["Enums"]["silo_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          actual_progress: number
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          phase: string
          project_id: string
          start_date: string | null
          status: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          actual_progress?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          phase?: string
          project_id: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          weight?: number
        }
        Update: {
          actual_progress?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          phase?: string
          project_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          goal: string | null
          id: string
          kickoff_data: Json | null
          name: string
          phase: string
          planned_progress: number
          priority: string | null
          responsible: string | null
          silo: string
          specific_goals: string[] | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          kickoff_data?: Json | null
          name: string
          phase?: string
          planned_progress?: number
          priority?: string | null
          responsible?: string | null
          silo: string
          specific_goals?: string[] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          kickoff_data?: Json | null
          name?: string
          phase?: string
          planned_progress?: number
          priority?: string | null
          responsible?: string | null
          silo?: string
          specific_goals?: string[] | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          archivado: boolean
          compania_id: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          archivado?: boolean
          compania_id: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          archivado?: boolean
          compania_id?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_compania_id_fkey"
            columns: ["compania_id"]
            isOneToOne: false
            referencedRelation: "companias"
            referencedColumns: ["id"]
          },
        ]
      }
      review_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          document_id: string
          due_date: string
          id: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          document_id: string
          due_date: string
          id?: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          document_id?: string
          due_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      seguimientos: {
        Row: {
          categoria: string | null
          created_at: string
          descripcion: string | null
          estado: Database["public"]["Enums"]["seguimiento_estado"]
          fecha_completado: string | null
          fecha_limite: string | null
          id: string
          orden: number
          prioridad: Database["public"]["Enums"]["seguimiento_prioridad"]
          responsable: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["seguimiento_estado"]
          fecha_completado?: string | null
          fecha_limite?: string | null
          id?: string
          orden?: number
          prioridad?: Database["public"]["Enums"]["seguimiento_prioridad"]
          responsable?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["seguimiento_estado"]
          fecha_completado?: string | null
          fecha_limite?: string | null
          id?: string
          orden?: number
          prioridad?: Database["public"]["Enums"]["seguimiento_prioridad"]
          responsable?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_casos: {
        Row: {
          created_at: string
          created_by: string | null
          entorno: Database["public"]["Enums"]["test_entorno"]
          estado: Database["public"]["Enums"]["test_caso_estado"]
          id: string
          modulo: string | null
          numero: number
          orden: number
          responsable: string | null
          resultado_esperado: string | null
          resultado_obtenido: string | null
          ruta_acceso: string | null
          script_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entorno?: Database["public"]["Enums"]["test_entorno"]
          estado?: Database["public"]["Enums"]["test_caso_estado"]
          id?: string
          modulo?: string | null
          numero?: number
          orden?: number
          responsable?: string | null
          resultado_esperado?: string | null
          resultado_obtenido?: string | null
          ruta_acceso?: string | null
          script_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entorno?: Database["public"]["Enums"]["test_entorno"]
          estado?: Database["public"]["Enums"]["test_caso_estado"]
          id?: string
          modulo?: string | null
          numero?: number
          orden?: number
          responsable?: string | null
          resultado_esperado?: string | null
          resultado_obtenido?: string | null
          ruta_acceso?: string | null
          script_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_casos_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "test_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      test_scripts: {
        Row: {
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          proyecto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          proyecto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          proyecto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_scripts_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      documentos_activos: {
        Row: {
          drive_id_original: string | null
          eliminado: boolean | null
          fecha_actualizacion: string | null
          fecha_eliminacion: string | null
          fecha_ingesta: string | null
          hash_sha256: string | null
          id: string | null
          metadata_original: Json | null
          nombre: string | null
          origen_ingesta: string | null
          propietario_sistema: boolean | null
          storage_bucket: string | null
          storage_path: string | null
          tamano_bytes: number | null
          tipo_mime: string | null
          usuario_id: string | null
        }
        Insert: {
          drive_id_original?: string | null
          eliminado?: boolean | null
          fecha_actualizacion?: string | null
          fecha_eliminacion?: string | null
          fecha_ingesta?: string | null
          hash_sha256?: string | null
          id?: string | null
          metadata_original?: Json | null
          nombre?: string | null
          origen_ingesta?: string | null
          propietario_sistema?: boolean | null
          storage_bucket?: string | null
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo_mime?: string | null
          usuario_id?: string | null
        }
        Update: {
          drive_id_original?: string | null
          eliminado?: boolean | null
          fecha_actualizacion?: string | null
          fecha_eliminacion?: string | null
          fecha_ingesta?: string | null
          hash_sha256?: string | null
          id?: string | null
          metadata_original?: Json | null
          nombre?: string | null
          origen_ingesta?: string | null
          propietario_sistema?: boolean | null
          storage_bucket?: string | null
          storage_path?: string | null
          tamano_bytes?: number | null
          tipo_mime?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      normas: {
        Row: {
          fecha_creacion: string | null
          titulo: string | null
        }
        Insert: {
          fecha_creacion?: string | null
          titulo?: string | null
        }
        Update: {
          fecha_creacion?: string | null
          titulo?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_silo: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      soft_delete_documento: { Args: { doc_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer" | "responsable_metodos"
      doc_type:
        | "norma"
        | "manual"
        | "procedimiento"
        | "anexo"
        | "formato"
        | "diagrama"
        | "instructivo"
        | "politica"
        | "descripcion_cargo"
        | "libro"
        | "presentacion_clave"
        | "presentacion"
        | "gestion_beneficios"
      empresa_type: "mayoreo" | "beconsult" | "epa"
      frequency_type:
        | "diario"
        | "semanal"
        | "quincenal"
        | "mensual"
        | "trimestral"
        | "semestral"
        | "anual"
      incidencia_estado: "pendiente" | "en_curso" | "resuelto"
      incidencia_prioridad: "baja" | "media" | "alta"
      indicator_type:
        | "eficiencia"
        | "eficacia"
        | "efectividad"
        | "calidad"
        | "productividad"
        | "cumplimiento"
      modulo_erp:
        | "nomina"
        | "ventas"
        | "compras"
        | "inventario"
        | "contabilidad"
      seguimiento_estado:
        | "pendiente"
        | "en_revision"
        | "en_progreso"
        | "completado"
        | "cancelado"
      seguimiento_prioridad: "baja" | "media" | "alta" | "critica"
      silo_type:
        | "compras"
        | "logistica"
        | "ventas"
        | "personal"
        | "control"
        | "mercadeo"
        | "sistemas"
        | "procesos"
        | "sinsilo"
      test_caso_estado: "pendiente" | "en_curso" | "completada"
      test_entorno: "QA" | "PRD"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "viewer", "responsable_metodos"],
      doc_type: [
        "norma",
        "manual",
        "procedimiento",
        "anexo",
        "formato",
        "diagrama",
        "instructivo",
        "politica",
        "descripcion_cargo",
        "libro",
        "presentacion_clave",
        "presentacion",
        "gestion_beneficios",
      ],
      empresa_type: ["mayoreo", "beconsult", "epa"],
      frequency_type: [
        "diario",
        "semanal",
        "quincenal",
        "mensual",
        "trimestral",
        "semestral",
        "anual",
      ],
      incidencia_estado: ["pendiente", "en_curso", "resuelto"],
      incidencia_prioridad: ["baja", "media", "alta"],
      indicator_type: [
        "eficiencia",
        "eficacia",
        "efectividad",
        "calidad",
        "productividad",
        "cumplimiento",
      ],
      modulo_erp: ["nomina", "ventas", "compras", "inventario", "contabilidad"],
      seguimiento_estado: [
        "pendiente",
        "en_revision",
        "en_progreso",
        "completado",
        "cancelado",
      ],
      seguimiento_prioridad: ["baja", "media", "alta", "critica"],
      silo_type: [
        "compras",
        "logistica",
        "ventas",
        "personal",
        "control",
        "mercadeo",
        "sistemas",
        "procesos",
        "sinsilo",
      ],
      test_caso_estado: ["pendiente", "en_curso", "completada"],
      test_entorno: ["QA", "PRD"],
    },
  },
} as const
