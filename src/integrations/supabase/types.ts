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
          storage_bucket: string
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
          id?: string
          metadata_original?: Json | null
          nombre: string
          origen_ingesta?: string | null
          propietario_sistema?: boolean | null
          storage_bucket?: string
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
          id?: string
          metadata_original?: Json | null
          nombre?: string
          origen_ingesta?: string | null
          propietario_sistema?: boolean | null
          storage_bucket?: string
          storage_path?: string | null
          tamano_bytes?: number | null
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
    }
    Functions: {
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
      app_role: "admin" | "editor" | "viewer"
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
      indicator_type:
        | "eficiencia"
        | "eficacia"
        | "efectividad"
        | "calidad"
        | "productividad"
        | "cumplimiento"
      silo_type:
        | "compras"
        | "logistica"
        | "ventas"
        | "personal"
        | "control"
        | "mercadeo"
        | "sistemas"
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
      app_role: ["admin", "editor", "viewer"],
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
      indicator_type: [
        "eficiencia",
        "eficacia",
        "efectividad",
        "calidad",
        "productividad",
        "cumplimiento",
      ],
      silo_type: [
        "compras",
        "logistica",
        "ventas",
        "personal",
        "control",
        "mercadeo",
        "sistemas",
      ],
    },
  },
} as const
