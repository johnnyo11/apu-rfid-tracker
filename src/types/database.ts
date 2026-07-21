export type EquipmentLocation = {
  id: number;
  name: string;
  type: string | null;
  block: string | null;
  level: number | null;
  location_detail: string | null;
};

export type RfidTag = {
  tagged_id: number;
  status: string | null;
  tagged_at: string;
};

export type Equipment = {
  id: number;
  code: string;
  category: string;
  subcategory: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  condition_when_received: string | null;
  current_condition: string;
  acquired_at: string | null;
  invoice_number: string | null;
  purchase_cost: number | null;
  warranty_end_date: string | null;
  status: string;
  location_id: number | null;
  location: EquipmentLocation | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  rfid_tag: RfidTag | null;
  is_tagged: boolean;
  total_hours_used: number;
  used_threshold: number | null;
  estimated_operating_hours: number;
  maintenance_state: "normal" | "inspection_soon" | "inspection_due";
};

export type Location = {
  id: number;
  name: string;
  type: string | null;
  block: string | null;
  level: number | null;
  location_detail: string | null;
  equipment: { id: number }[];
};

export type AvailableLocationEquipment = {
  id: number;
  code: string;
  category: string | null;
  subcategory: string | null;
  location_id: number | null;
  location_name: string | null;
};

export type User = {
  id: number;
  user_code: string;
  full_name: string;
  role: string;
  birthdate: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  profile_image_url: string | null;
};

export type EventLocation = {
  id: number;
  is_main_location: boolean;
  location: {
    id: number;
    name: string;
    block: string | null;
    level: number | null;
  } | null;
};

export type EventResponsibleUser = {
  part_timer_id: number;
  responsibility: string | null;
  part_timer: {
    id: number;
    student_id: string;
    name: string;
    role: string | null;
  } | null;
};

export type EventEquipment = {
  id: number;
  status: string;
  deployed_at: string | null;
  equipment: {
    id: number;
    code: string;
    subcategory: string;
    status: string;
    total_hours_used: number | null;
  } | null;
  event_location: EventLocation | null;
};

export type Event = {
  id: number;
  event_name: string;
  event_description: string | null;
  organizer_name: string | null;
  organizer_contact: string | null;
  start_at: string;
  end_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  responsible_users: EventResponsibleUser[];
  event_locations: EventLocation[];
  event_equipment: EventEquipment[];
};

export type ScanLog = {
  id: number;
  check_out: string;
  checked_in: string | null;
  rfid_tag: (RfidTag & {
    equipment: {
      id: number;
      code: string;
      subcategory: string;
    } | null;
  }) | null;
  event_equipment: {
    id: number;
    event: { id: number; event_name: string } | null;
  } | null;
};

export type MaintenanceLog = {
  id: number;
  equipment_id: number;
  issue_description: string | null;
  status: string;
  reported_at: string;
  serviced_at: string | null;
  resolved_at: string | null;
  notes: string | null;
};

export type EventFormOption = {
  id: number;
  label: string;
  detail?: string | null;
};

export type ScanActivity = {
  id: number;
  movement_type: string;
  scanned_at: string;
  equipment: {
    id: number;
    code: string;
    subcategory: string;
  } | null;
};

export type MaintenanceActivity = MaintenanceLog & {
  equipment: {
    id: number;
    code: string;
    subcategory: string;
    total_hours_used: number | null;
    used_threshold: number | null;
  } | null;
};

export type RfidAssignment = {
  tagged_id: number;
  tag_code: string | null;
  tag_uid: string | null;
  status: string | null;
  tagged_at: string;
  equipment: {
    id: number;
    code: string;
    subcategory: string;
  } | null;
};
