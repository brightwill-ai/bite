export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.1'
  }
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          cuisine_type: string | null
          address: string | null
          timezone: string | null
          is_active: boolean | null
          subscription_tier: string | null
          printnode_api_key: string | null
          printnode_printer_id: string | null
          adyen_merchant_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          cuisine_type?: string | null
          address?: string | null
          timezone?: string | null
          is_active?: boolean | null
          subscription_tier?: string | null
          printnode_api_key?: string | null
          printnode_printer_id?: string | null
          adyen_merchant_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          cuisine_type?: string | null
          address?: string | null
          timezone?: string | null
          is_active?: boolean | null
          subscription_tier?: string | null
          printnode_api_key?: string | null
          printnode_printer_id?: string | null
          adyen_merchant_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string
          name: string
          email: string
          role: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id: string
          name: string
          email: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string
          name?: string
          email?: string
          role?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'staff_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      tables: {
        Row: {
          id: string
          restaurant_id: string
          table_number: string
          label: string | null
          qr_code_url: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          table_number: string
          label?: string | null
          qr_code_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          table_number?: string
          label?: string | null
          qr_code_url?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tables_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          display_order: number | null
          is_available: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          display_order?: number | null
          is_available?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          display_order?: number | null
          is_available?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_categories_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          emoji: string | null
          is_available: boolean | null
          is_popular: boolean | null
          is_new: boolean | null
          needs_review: boolean | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          emoji?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          is_new?: boolean | null
          needs_review?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          category_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          emoji?: string | null
          is_available?: boolean | null
          is_popular?: boolean | null
          is_new?: boolean | null
          needs_review?: boolean | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'menu_items_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      modifier_groups: {
        Row: {
          id: string
          item_id: string
          name: string
          selection_type: string
          is_required: boolean | null
          min_selections: number | null
          max_selections: number | null
          display_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_id: string
          name: string
          selection_type?: string
          is_required?: boolean | null
          min_selections?: number | null
          max_selections?: number | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          name?: string
          selection_type?: string
          is_required?: boolean | null
          min_selections?: number | null
          max_selections?: number | null
          display_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'modifier_groups_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
        ]
      }
      modifiers: {
        Row: {
          id: string
          group_id: string
          name: string
          price_delta: number | null
          is_available: boolean | null
          display_order: number | null
          emoji: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id: string
          name: string
          price_delta?: number | null
          is_available?: boolean | null
          display_order?: number | null
          emoji?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          name?: string
          price_delta?: number | null
          is_available?: boolean | null
          display_order?: number | null
          emoji?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'modifiers_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'modifier_groups'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          session_id: string
          restaurant_id: string
          table_id: string
          ticket_number: number
          status: string
          special_instructions: string | null
          subtotal: number | null
          tax: number | null
          tip: number | null
          total: number | null
          payment_status: string | null
          payment_intent_id: string | null
          print_status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          restaurant_id: string
          table_id: string
          ticket_number: number
          status?: string
          special_instructions?: string | null
          subtotal?: number | null
          tax?: number | null
          tip?: number | null
          total?: number | null
          payment_status?: string | null
          payment_intent_id?: string | null
          print_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          restaurant_id?: string
          table_id?: string
          ticket_number?: number
          status?: string
          special_instructions?: string | null
          subtotal?: number | null
          tax?: number | null
          tip?: number | null
          total?: number | null
          payment_status?: string | null
          payment_intent_id?: string | null
          print_status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_table_id_fkey'
            columns: ['table_id']
            isOneToOne: false
            referencedRelation: 'tables'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          item_name: string
          item_price: number
          quantity: number
          subtotal: number
          created_at: string | null
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          item_name: string
          item_price: number
          quantity?: number
          subtotal: number
          created_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string | null
          item_name?: string
          item_price?: number
          quantity?: number
          subtotal?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            isOneToOne: false
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      order_item_modifiers: {
        Row: {
          id: string
          order_item_id: string
          modifier_id: string | null
          name: string
          price_delta: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          order_item_id: string
          modifier_id?: string | null
          name: string
          price_delta?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_item_id?: string
          modifier_id?: string | null
          name?: string
          price_delta?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'order_item_modifiers_modifier_id_fkey'
            columns: ['modifier_id']
            isOneToOne: false
            referencedRelation: 'modifiers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_item_modifiers_order_item_id_fkey'
            columns: ['order_item_id']
            isOneToOne: false
            referencedRelation: 'order_items'
            referencedColumns: ['id']
          },
        ]
      }
      menu_uploads: {
        Row: {
          id: string
          restaurant_id: string
          file_url: string
          status: string
          parsed_data: Json | null
          error_message: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          restaurant_id: string
          file_url: string
          status?: string
          parsed_data?: Json | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string
          file_url?: string
          status?: string
          parsed_data?: Json | null
          error_message?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_uploads_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_order: {
        Args: {
          p_session_id: string
          p_restaurant_id: string
          p_table_id: string
          p_special_instructions?: string
          p_items?: Json
        }
        Returns: Json
      }
      get_next_ticket_number: {
        Args: { p_restaurant_id: string }
        Returns: number
      }
      get_user_restaurant_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
