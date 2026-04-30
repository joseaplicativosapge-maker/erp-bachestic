import express, { Request } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Extend Request type for Multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('bachestic.db');

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

async function startServer() {
  console.log('Starting server initialization...');

  // Initialize Database
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      doc TEXT UNIQUE,
      doc_type TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE,
      client_id INTEGER,
      client_name TEXT,
      client_doc TEXT,
      client_doc_type TEXT,
      client_phone TEXT,
      client_address TEXT,
      client_city TEXT,
      contact_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      delivery_date DATETIME,
      status TEXT DEFAULT 'Cotización',
      payment_status TEXT DEFAULT 'Pendiente',
      team_id INTEGER,
      assigned_employee_id INTEGER,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY(client_id) REFERENCES clients(id),
      FOREIGN KEY(assigned_employee_id) REFERENCES employees(id),
      FOREIGN KEY(team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      name TEXT NOT NULL,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(client_id) REFERENCES clients(id)
    );
  `);
  
  try {
    db.prepare('ALTER TABLE products DROP COLUMN sale_price').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE products ADD COLUMN code TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE clients ADD COLUMN doc_type TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN client_doc_type TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN client_id INTEGER REFERENCES clients(id)').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN assigned_employee_id INTEGER REFERENCES employees(id)').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN team_id INTEGER REFERENCES teams(id)').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE order_items ADD COLUMN sewing_price REAL DEFAULT 0').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE order_items ADD COLUMN design_path TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE employees ADD COLUMN photo_path TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE design_versions ADD COLUMN client_comments TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN soligem_code TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN is_reposition BOOLEAN DEFAULT 0').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN reposition_reason TEXT').run();
  } catch (e) {}

  try {
    db.prepare('ALTER TABLE orders ADD COLUMN reposition_from_status TEXT').run();
  } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      item_name TEXT,
      player_name TEXT,
      number TEXT,
      size TEXT,
      sleeve TEXT,
      design_type TEXT,
      fit TEXT,
      garment_type TEXT,
      observations TEXT,
      sewing_price REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      design_path TEXT,
      active BOOLEAN DEFAULT 1,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS design_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      version_number INTEGER,
      file_path TEXT,
      thumbnail_path TEXT,
      comments TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS design_references (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      file_path TEXT,
      file_type TEXT,
      uploaded_by TEXT,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS order_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      user_name TEXT,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      pin TEXT NOT NULL,
      photo_path TEXT,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      sewing_cost REAL DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS production_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      employee_id INTEGER,
      department TEXT,
      status TEXT,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      garment_count INTEGER,
      price_per_unit REAL,
      total_pay REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(employee_id) REFERENCES employees(id)
    );

    -- Seed initial admin if no employees exist
    INSERT INTO employees (name, role, pin) 
    SELECT 'Administrador', 'Admin', '1234'
    WHERE NOT EXISTS (SELECT 1 FROM employees);
  `);
  
  db.exec(`
    PRAGMA foreign_keys = OFF;

    DELETE FROM orders;
    DELETE FROM teams;
    DELETE FROM order_items;
    DELETE FROM design_versions;
    DELETE FROM design_references;
    DELETE FROM order_history;
    DELETE FROM production_assignments;

    DELETE FROM sqlite_sequence;

    PRAGMA foreign_keys = ON;

    VACUUM;
  `);

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Multer setup
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  const upload = multer({ storage });

  // ─── Employee Routes ───────────────────────────────────────────────────────

  app.post('/api/login', (req, res) => {
    const { pin } = req.body;
    const user = db.prepare('SELECT id, name, role, photo_path FROM employees WHERE pin = ? AND active = 1').get(pin);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'PIN incorrecto' });
    }
  });

  app.get('/api/employees', (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const query = includeInactive
      ? 'SELECT * FROM employees ORDER BY name ASC'
      : 'SELECT * FROM employees WHERE active = 1 ORDER BY name ASC';
    const employees = db.prepare(query).all();
    res.json(employees);
  });

  app.post('/api/employees', upload.single('photo'), (req: MulterRequest, res) => {
    const { name, role, phone, pin } = req.body;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
    const info = db.prepare('INSERT INTO employees (name, role, phone, pin, photo_path) VALUES (?, ?, ?, ?, ?)').run(name, role, phone, pin, photo_path);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/employees/:id', upload.single('photo'), (req: MulterRequest, res) => {
    const { name, role, phone, pin, active } = req.body;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : undefined;

    const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Employee not found' });

    const updatedName    = name   !== undefined ? name   : current.name;
    const updatedRole    = role   !== undefined ? role   : current.role;
    const updatedPhone   = phone  !== undefined ? phone  : current.phone;
    const updatedPin     = pin    !== undefined ? pin    : current.pin;
    const updatedActive  = active !== undefined ? (active === 'true' || active === true ? 1 : 0) : current.active;
    const updatedPhoto   = photo_path !== undefined ? photo_path : current.photo_path;

    db.prepare(`
      UPDATE employees
      SET name = ?, role = ?, phone = ?, pin = ?, active = ?, photo_path = ?
      WHERE id = ?
    `).run(updatedName, updatedRole, updatedPhone, updatedPin, updatedActive, updatedPhoto, req.params.id);

    res.json({ success: true });
  });

  // ─── Product Routes ────────────────────────────────────────────────────────

  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY category, name').all();
    res.json(products);
  });

  app.post('/api/products', (req, res) => {
    const { code, name, category, sewing_cost } = req.body;
    const info = db.prepare(`
      INSERT INTO products (code, name, category, sewing_cost)
      VALUES (?, ?, ?, ?)
    `).run(code, name, category, sewing_cost);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/products/:id', (req, res) => {
    const { code, name, category, sewing_cost, active } = req.body;
    db.prepare(`
      UPDATE products
      SET code = ?, name = ?, category = ?, sewing_cost = ?, active = ?
      WHERE id = ?
    `).run(code, name, category, sewing_cost, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);
    res.json({ success: true });
  });

  // ─── Production Assignment Routes ─────────────────────────────────────────

  app.post('/api/assignments', (req, res) => {
    const { order_id, employee_id, department, garment_count, price_per_unit } = req.body;
    const total_pay = (garment_count || 0) * (price_per_unit || 0);

    db.transaction(() => {
      db.prepare(`
        INSERT INTO production_assignments (order_id, employee_id, department, status, garment_count, price_per_unit, total_pay)
        VALUES (?, ?, ?, 'Iniciado', ?, ?, ?)
      `).run(order_id, employee_id, department, garment_count, price_per_unit, total_pay);

      db.prepare(`
        UPDATE orders SET assigned_employee_id = ? WHERE id = ?
      `).run(employee_id, order_id);
    })();

    res.json({ success: true });
  });

  // ─── Reports Routes ────────────────────────────────────────────────────────

  app.get('/api/reports/employees', (req, res) => {
    const report = db.prepare(`
      SELECT
        e.name as employee_name,
        e.role,
        SUM(pa.garment_count) as total_garments,
        SUM(pa.total_pay) as total_earned
      FROM employees e
      JOIN production_assignments pa ON e.id = pa.employee_id
      WHERE pa.assigned_at >= date('now', 'start of month')
      GROUP BY e.id
      ORDER BY total_earned DESC
    `).all();
    res.json(report);
  });

  // ─── Order Routes ──────────────────────────────────────────────────────────

  app.get('/api/orders', (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const query = includeInactive
      ? `SELECT o.*, t.name as team_name, o.is_reposition, o.reposition_reason FROM orders o LEFT JOIN teams t ON o.team_id = t.id ORDER BY o.created_at DESC`
      : `SELECT o.*, t.name as team_name, o.is_reposition, o.reposition_reason FROM orders o LEFT JOIN teams t ON o.team_id = t.id WHERE o.active = 1 ORDER BY o.created_at DESC`;

    const orders = db.prepare(query).all();
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: getItems.all(order.id)
    }));

    res.json(ordersWithItems);
  });

  app.get('/api/orders/:id/history', (req, res) => {
    const history = db.prepare('SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(history);
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = db.prepare(`
      SELECT o.*, t.name as team_name, 
      o.is_reposition, o.reposition_reason
      FROM orders o
      LEFT JOIN teams t ON o.team_id = t.id
      WHERE o.id = ?
    `).get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items      = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    const versions   = db.prepare('SELECT * FROM design_versions WHERE order_id = ? ORDER BY version_number DESC').all(req.params.id);
    const references = db.prepare('SELECT * FROM design_references WHERE order_id = ?').all(req.params.id);
    const history    = db.prepare('SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id);

    res.json({ ...order, items, versions, references, history });
  });

  app.post('/api/orders', (req, res) => {
    const {
      client_id, client_name, client_doc, client_doc_type, client_phone,
      client_address, client_city, contact_method, delivery_date,
      team_id, user_name, soligem_code, status
    } = req.body;
    const order_number = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    const info = db.prepare(`
      INSERT INTO orders (order_number, client_id, client_name, client_doc, client_doc_type, client_phone, client_address, client_city, contact_method, delivery_date, team_id, soligem_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(order_number, client_id, client_name, client_doc, client_doc_type, client_phone, client_address, client_city, contact_method, delivery_date, team_id, soligem_code || null, status);

    const order_id = info.lastInsertRowid;
    db.prepare('INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(order_id, user_name || 'Sistema', 'Creación', `Orden ${order_number} creada`);

    res.json({ id: order_id, order_number });
  });

  app.put('/api/orders/:id', (req, res) => {
    const {
      client_id, client_name, client_doc, client_doc_type, client_phone,
      client_address, client_city, contact_method, delivery_date,
      items, active, team_id, user_name, soligem_code, status, is_reposition,
      reposition_reason, reposition_from_status
    } = req.body;
    const order_id = req.params.id;

    const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!current) return res.status(404).json({ error: 'Order not found' });

    const updatedClientId      = client_id        !== undefined ? client_id        : current.client_id;
    const updatedClientName    = client_name       !== undefined ? client_name      : current.client_name;
    const updatedClientDoc     = client_doc        !== undefined ? client_doc       : current.client_doc;
    const updatedClientDocType = client_doc_type   !== undefined ? client_doc_type  : current.client_doc_type;
    const updatedClientPhone   = client_phone      !== undefined ? client_phone     : current.client_phone;
    const updatedClientAddress = client_address    !== undefined ? client_address   : current.client_address;
    const updatedClientCity    = client_city       !== undefined ? client_city      : current.client_city;
    const updatedContactMethod = contact_method    !== undefined ? contact_method   : current.contact_method;
    const updatedDeliveryDate  = delivery_date     !== undefined ? delivery_date    : current.delivery_date;
    const updatedActive        = active            !== undefined ? (active === 'true' || active === true ? 1 : 0) : current.active;
    const updatedTeamId        = team_id           !== undefined ? team_id          : current.team_id;
    const updatedSoligemCode = soligem_code !== undefined ? soligem_code : current.soligem_code;
    const updatedStatus = status !== undefined ? status : current.status;
    const updatedIsReposition = is_reposition !== undefined ? (is_reposition ? 1 : 0) 
      : current.is_reposition;
    const updatedRepositionReason = reposition_reason !== undefined ? reposition_reason 
      : current.reposition_reason;
    const updatedRepositionFromStatus = reposition_from_status !== undefined 
      ? reposition_from_status 
      : current.reposition_from_status;

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE orders
        SET client_id = ?, client_name = ?, client_doc = ?, client_doc_type = ?, client_phone = ?,
            client_address = ?, client_city = ?, contact_method = ?, delivery_date = ?,
            active = ?, team_id = ?, soligem_code = ?, status = ?, is_reposition = ?, reposition_reason = ?, reposition_from_status = ?
        WHERE id = ?
      `).run(
        updatedClientId, 
        updatedClientName, 
        updatedClientDoc, 
        updatedClientDocType,
        updatedClientPhone, 
        updatedClientAddress, 
        updatedClientCity, 
        updatedContactMethod,
        updatedDeliveryDate, 
        updatedActive, 
        updatedTeamId, 
        updatedSoligemCode, 
        updatedStatus,
        updatedIsReposition,
        updatedRepositionReason,
        updatedRepositionFromStatus,
        order_id
      );

      if (items !== undefined) {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order_id);
        const insertItem = db.prepare(`
          INSERT INTO order_items (order_id, item_name, player_name, number, size, sleeve, design_type, fit, garment_type, observations, sewing_price, sale_price, design_path, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of items) {
          insertItem.run(
            order_id, item.item_name, item.player_name, item.number, item.size,
            item.sleeve, item.design_type, item.fit, item.garment_type,
            item.observations, item.sewing_price || 0, item.sale_price || 0,
            item.design_path || null, item.active !== undefined ? (item.active ? 1 : 0) : 1
          );
        }
      }

      db.prepare('INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(order_id, user_name || 'Sistema', 'Actualización', 'Datos de la orden actualizados');
    });

    transaction();
    res.json({ success: true });
  });

  app.post('/api/orders/:id/items', (req, res) => {
    const { items } = req.body;
    const order_id = req.params.id;
    const insert = db.prepare(`
      INSERT INTO order_items (order_id, item_name, player_name, number, size, sleeve, design_type, fit, garment_type, observations, sewing_price, sale_price, design_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      const createdItems = [];
      for (const item of items) {
        const info = insert.run(
          order_id, item.item_name, item.player_name, item.number, item.size,
          item.sleeve, item.design_type, item.fit, item.garment_type,
          item.observations, item.sewing_price || 0, item.sale_price || 0, item.design_path || null
        );
        createdItems.push({ id: info.lastInsertRowid, ...item });
      }
      return createdItems;
    });

    const createdItems = transaction(items);
    res.json({ success: true, items: createdItems });
  });

  app.post('/api/orders/:id/status', (req, res) => {
    const { status, user_name, details_override } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    const details = details_override || `Estado cambiado a: ${status}`;
    db.prepare('INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(req.params.id, user_name || 'Sistema', 'Cambio de Estado', details);
    res.json({ success: true });
  });

  // ─── Client Routes ─────────────────────────────────────────────────────────

  app.get('/api/clients', (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const query = includeInactive
      ? 'SELECT * FROM clients ORDER BY name ASC'
      : 'SELECT * FROM clients WHERE active = 1 ORDER BY name ASC';
    const clients = db.prepare(query).all();
    res.json(clients);
  });

  app.get('/api/clients/search', (req, res) => {
    const q = req.query.q;
    const clients = db.prepare('SELECT * FROM clients WHERE active = 1 AND (name LIKE ? OR doc LIKE ?) LIMIT 10').all(`%${q}%`, `%${q}%`);
    res.json(clients);
  });

  app.post('/api/clients', (req, res) => {
    const { name, doc, doc_type, phone, address, city, email } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO clients (name, doc, doc_type, phone, address, city, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name, doc, doc_type, phone, address, city, email);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    const { name, doc, doc_type, phone, address, city, email, active } = req.body;
    const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Client not found' });

    const updatedName    = name     !== undefined ? name     : current.name;
    const updatedDoc     = doc      !== undefined ? doc      : current.doc;
    const updatedDocType = doc_type !== undefined ? doc_type : current.doc_type;
    const updatedPhone   = phone    !== undefined ? phone    : current.phone;
    const updatedAddress = address  !== undefined ? address  : current.address;
    const updatedCity    = city     !== undefined ? city     : current.city;
    const updatedEmail   = email    !== undefined ? email    : current.email;
    const updatedActive  = active   !== undefined ? (active === 'true' || active === true ? 1 : 0) : current.active;

    db.prepare(`
      UPDATE clients
      SET name = ?, doc = ?, doc_type = ?, phone = ?, address = ?, city = ?, email = ?, active = ?
      WHERE id = ?
    `).run(updatedName, updatedDoc, updatedDocType, updatedPhone, updatedAddress, updatedCity, updatedEmail, updatedActive, req.params.id);
    res.json({ success: true });
  });

  // ─── Team Routes ───────────────────────────────────────────────────────────

  app.get('/api/clients/:id/teams', (req, res) => {
    const teams = db.prepare('SELECT * FROM teams WHERE client_id = ? AND active = 1 ORDER BY name ASC').all(req.params.id);
    res.json(teams);
  });

  app.post('/api/clients/:id/teams', (req, res) => {
    const { name } = req.body;
    const info = db.prepare('INSERT INTO teams (client_id, name) VALUES (?, ?)').run(req.params.id, name);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/teams/:id', (req, res) => {
    const { name, active } = req.body;
    const current = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'Team not found' });

    const updatedName   = name   !== undefined ? name   : current.name;
    const updatedActive = active !== undefined ? (active ? 1 : 0) : current.active;

    db.prepare('UPDATE teams SET name = ?, active = ? WHERE id = ?').run(updatedName, updatedActive, req.params.id);
    res.json({ success: true });
  });

  // ─── Design Routes ─────────────────────────────────────────────────────────

  app.post('/api/design-versions/:id/status', (req, res) => {
    const { status, client_comments, order_id, user_name } = req.body;
    db.prepare('UPDATE design_versions SET status = ?, client_comments = ? WHERE id = ?').run(status, client_comments, req.params.id);
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order_id);

    const action  = status === 'Diseño aprobado' ? 'Diseño Aprobado' : 'Corrección Solicitada';
    const details = status === 'Diseño aprobado'
      ? 'El cliente aprobó el diseño.'
      : `El cliente solicitó correcciones: ${client_comments}`;

    db.prepare('INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(order_id, user_name || 'Cliente', action, details);
    res.json({ success: true });
  });

  app.post('/api/orders/:id/design-version', upload.single('design'), (req: MulterRequest, res) => {
    const { version_number, comments, created_by, status } = req.body;
    const file_path = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO design_versions (order_id, version_number, file_path, comments, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, version_number, file_path, comments, created_by, status);

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    db.prepare('INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(req.params.id, created_by || 'Sistema', 'Nueva Versión Diseño', `Versión ${version_number} cargada. Estado: ${status}`);

    res.json({ success: true });
  });

  app.post('/api/orders/:id/references', upload.array('references'), (req: MulterRequest, res) => {
    const { uploaded_by, comments } = req.body;
    const files = req.files as Express.Multer.File[];

    const insert = db.prepare(`
      INSERT INTO design_references (order_id, file_path, file_type, uploaded_by, comments)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const file of files) {
      insert.run(req.params.id, `/uploads/${file.filename}`, file.mimetype, uploaded_by, comments);
    }

    db.prepare('INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(req.params.id, uploaded_by || 'Sistema', 'Carga Referencias', `${files.length} archivos de referencia cargados`);

    res.json({ success: true });
  });

  // ─── Stats Route ───────────────────────────────────────────────────────────

  app.get('/api/stats', (req, res) => {
    const activeOrders  = db.prepare("SELECT COUNT(*) as count FROM orders WHERE active = 1 AND status != 'Entregado' AND status != 'Devuelto'").get().count;
    const delayedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE active = 1 AND delivery_date < date('now') AND status != 'Entregado'").get().count;

    res.json({ activeOrders, delayedOrders });
  });

  // ─── Fallbacks ─────────────────────────────────────────────────────────────

  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // ─── Vite / Static ─────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware in development mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware attached.');
  } else {
    console.log('Serving static files in production mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully started and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();