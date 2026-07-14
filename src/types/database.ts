export type Equipment = {
  id: number; code: string; category: string; subcategory: string;
  brand: string | null; model: string | null; serial_number: string | null;
  condition_when_received: string | null; current_condition: string;
  acquired_at: string | null; invoice_number: string | null;
  purchase_cost: number | null; warranty_end_date: string | null;
  status: string; location_id: number | null;
  location: { id: number; name: string; type: string | null; level: number | null; location_detail: string | null } | null;
  notes: string | null; created_at: string; updated_at: string; is_tagged: boolean;
};

export type Location = {
  id: number; name: string; type: string | null; block: string | null; level: number | null;
  location_detail: string | null; equipment: { id: number }[];
};

export type User = {
  id: number; user_code: string; full_name: string; role: string;
  birthdate: string | null; email: string | null; phone: string | null;
  status: string; profile_image_url: string | null;
};

export type Event = {
  id: number; event_name: string; event_description: string | null;
  pic_user_id: number | null; location_id: number | null;
  event_start_time: string; event_end_time: string | null; status: string;
  created_at: string;
  pic: { id: number; student_id: string; name: string } | null;
  location: { id: number; name: string } | null;
};
