export type DocumentRow = {
  id: string;
  match_id: string | null;
  kind: 'Protocol' | 'Roster' | 'Announcement' | 'Other';
  file_name: string;
  content_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
};
