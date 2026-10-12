export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type AppRole = 'author' | 'editor' | 'administrator'
export type PublicationStatus = 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'scheduled' | 'published' | 'archived'

type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}
type Profile = { user_id: string; display_name: string; bio: string; role: AppRole; avatar_path: string | null; created_at: string; updated_at: string }
type Category = { id: string; name: string; slug: string; description: string; created_at: string; updated_at: string }
type Tag = { id: string; name: string; slug: string; created_at: string }
type Article = { id: string; title: string; slug: string; excerpt: string; body: Json; cover_image_path: string | null; author_profile_id: string; category_id: string; status: PublicationStatus; seo_title: string | null; seo_description: string | null; scheduled_for: string | null; published_at: string | null; last_change_note: string | null; search_document: string; created_at: string; updated_at: string }
type ArticleTag = { article_id: string; tag_id: string; created_at: string }
type Revision = { id: string; article_id: string; revision_number: number; title: string; slug: string; excerpt: string; body: Json; cover_image_path: string | null; author_profile_id: string; category_id: string; status: PublicationStatus; seo_title: string | null; seo_description: string | null; scheduled_for: string | null; published_at: string | null; change_type: string; change_note: string; changed_by: string | null; created_at: string }
type Activity = { id: string; article_id: string | null; actor_profile_id: string | null; action: string; details: Json; created_at: string }

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>
      categories: Table<Category>
      tags: Table<Tag>
      articles: Table<Article>
      article_tags: Table<ArticleTag>
      article_revisions: Table<Revision>
      editorial_activity: Table<Activity>
    }
    Views: Record<string, never>
    Functions: { current_app_role: { Args: Record<string, never>; Returns: AppRole | null }; set_profile_role: { Args: { target_user_id: string; requested_role: AppRole }; Returns: undefined } }
    Enums: { app_role: AppRole; publication_status: PublicationStatus }
    CompositeTypes: Record<string, never>
  }
}
