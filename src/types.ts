export type OrderStatus = 
  | 'Cotización'
  | 'Abono pendiente'
  | 'Abono confirmado'
  | 'En diseño'
  | 'Versión enviada'
  | 'Corrección solicitada'
  | 'Diseño aprobado'
  | 'En cuadro'
  | 'En montaje'
  | 'En impresión interna'
  | 'Arte final cargado'
  | 'En impresión'
  | 'En sublimación'
  | 'En corte'
  | 'En confección'
  | 'En empaque'
  | 'En despacho'
  | 'En transporte'
  | 'Entregado'
  | 'Devuelto';

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  payment_method: string;
  reference: string;
  created_at: string;
  created_by: string;
  notes: string;
  file_path?: string;
}

export interface Team {
  id: number;
  client_id: number;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  client_name: string;
  client_doc: string;
  client_doc_type?: string;
  client_phone: string;
  client_address: string;
  client_city: string;
  contact_method: string;
  created_at: string;
  delivery_date: string;
  status: OrderStatus;
  payment_status: string;
  advance_paid: boolean;
  total_paid: number;
  total_amount: number;
  advance_amount: number;
  items?: OrderItem[];
  versions?: DesignVersion[];
  references?: DesignReference[];
  history?: OrderHistory[];
  active: boolean;
  client_id?: number;
  team_id?: number;
  team_name?: string;
  assigned_employee_id?: number;
  is_reposition?: boolean;
  reposition_reason?: string;
}

export interface Client {
  id: number;
  name: string;
  doc: string;
  doc_type?: string;
  phone: string;
  address: string;
  city: string;
  email?: string;
  created_at: string;
  active: boolean;
  teams?: Team[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_name: string;
  player_name: string;
  number: string;
  size: string;
  sleeve: string;
  collar_type: string;
  design_type: string;
  fit: string;
  garment_type: string;
  observations: string;
  sewing_price?: number;
  sale_price?: number;
  design_path?: string;
  active: boolean;
}

export interface DesignVersion {
  id: number;
  order_id: number;
  version_number: number;
  file_path: string;
  thumbnail_path?: string;
  comments: string;
  client_comments?: string;
  status: string;
  created_at: string;
  created_by: string;
}

export interface DesignReference {
  id: number;
  order_id: number;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  comments: string;
  created_at: string;
}

export interface OrderHistory {
  id: number;
  order_id: number;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
  role: Role;
  phone?: string;
  pin: string;
  photo_path?: string;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  sale_price: number;
  sewing_cost: number;
  active: boolean;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  role: Role;
  photo_path?: string;
}

export interface ProductionAssignment {
  id: number;
  order_id: number;
  employee_id: number;
  department: string;
  status: string;
  assigned_at: string;
  completed_at?: string;
  garment_count: number;
  price_per_unit: number;
  total_pay: number;
}

export interface EmployeeReport {
  employee_name: string;
  role: string;
  total_garments: number;
  total_earned: number;
}

export type Role = 
  | 'Admin'
  | 'Ventas'
  | 'Diseño'
  | 'Impresión'
  | 'Sublimación'
  | 'Corte'
  | 'Confección'
  | 'Empaque'
  | 'Transporte'
  | 'Cliente';
