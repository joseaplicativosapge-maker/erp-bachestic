import express, { Request } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import fs from 'fs';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('bachestic.db');

if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

async function startServer() {
  console.log('Starting server initialization...');

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
      total_amount REAL DEFAULT 0,
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
      category TEXT DEFAULT 'Uniforme',
      sewing_cost REAL DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uniform_zone_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      zone_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      UNIQUE(order_id, zone_id)
    );

    INSERT INTO employees (name, role, pin)
    SELECT 'Administrador', 'Admin', '1234'
    WHERE NOT EXISTS (SELECT 1 FROM employees);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS production_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      department TEXT NOT NULL DEFAULT 'Confección',
      garment_count INTEGER NOT NULL DEFAULT 0,
      price_per_unit REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  // Migrations — all wrapped in try/catch so re-runs are safe
  const migrations = [
    'ALTER TABLE products ADD COLUMN price_filetes REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_despuntes REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_collarin REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_dobladillo_remate REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_filete_p REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_despuntes_p REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_caucho REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_sentar_caucho REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_collarin_p REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN price_remate REAL DEFAULT 0',
    'ALTER TABLE products ADD COLUMN code TEXT',
    'ALTER TABLE clients ADD COLUMN doc_type TEXT',
    'ALTER TABLE orders ADD COLUMN client_doc_type TEXT',
    'ALTER TABLE orders ADD COLUMN client_id INTEGER REFERENCES clients(id)',
    'ALTER TABLE orders ADD COLUMN assigned_employee_id INTEGER REFERENCES employees(id)',
    'ALTER TABLE orders ADD COLUMN team_id INTEGER REFERENCES teams(id)',
    'ALTER TABLE order_items ADD COLUMN sewing_price REAL DEFAULT 0',
    'ALTER TABLE order_items ADD COLUMN design_path TEXT',
    'ALTER TABLE employees ADD COLUMN photo_path TEXT',
    'ALTER TABLE design_versions ADD COLUMN client_comments TEXT',
    'ALTER TABLE orders ADD COLUMN soligem_code TEXT',
    'ALTER TABLE orders ADD COLUMN is_reposition BOOLEAN DEFAULT 0',
    'ALTER TABLE orders ADD COLUMN reposition_reason TEXT',
    'ALTER TABLE orders ADD COLUMN reposition_from_status TEXT',
    'ALTER TABLE orders ADD COLUMN is_priority BOOLEAN DEFAULT 0',
    "ALTER TABLE order_items ADD COLUMN section TEXT DEFAULT 'uniforme'",
  ];

  for (const sql of migrations) {
    try { db.prepare(sql).run(); } catch (_) {}
  }

  // DROP sale_price from products if it exists (non-fatal)
  try { db.prepare('ALTER TABLE products DROP COLUMN sale_price').run(); } catch (_) {}

  // ─── Express app ───────────────────────────────────────────────────────────

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename:    (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  });
  const upload = multer({ storage });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  app.post('/api/login', (req, res) => {
    const { pin } = req.body;
    const user = db.prepare('SELECT id, name, role, photo_path FROM employees WHERE pin = ? AND active = 1').get(pin);
    if (user) res.json(user);
    else res.status(401).json({ error: 'PIN incorrecto' });
  });

  // ─── Assignments ───────────────────────────────────────────────────────────

  app.get('/api/assignments', (_req, res) => {
    try {
      const assignments = db.prepare(`
        SELECT pa.*, o.order_number, e.name as employee_name
        FROM production_assignments pa
        LEFT JOIN orders o ON o.id = pa.order_id
        LEFT JOIN employees e ON e.id = pa.employee_id
        ORDER BY pa.created_at DESC
      `).all();
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/assignments', (req, res) => {
    const { order_id, employee_id, department, garment_count, price_per_unit, notes } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO production_assignments
          (order_id, employee_id, department, garment_count, price_per_unit, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(order_id, employee_id, department, garment_count, price_per_unit, notes || '');

      const emp = db.prepare('SELECT name FROM employees WHERE id = ?').get(employee_id) as any;
      db.prepare(`
        INSERT INTO order_history (order_id, action, details, user_name, created_at)
        VALUES (?, 'Asignación', ?, ?, datetime('now'))
      `).run(
        order_id,
        `${emp?.name || 'Empleado'} — ${garment_count} prendas × $${price_per_unit} (${department})${notes ? ' — ' + notes : ''}`,
        req.body.user_name || 'Sistema',
      );

      res.json({ id: result.lastInsertRowid, success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/assignments/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM production_assignments WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id/assignments', (req, res) => {
    try {
      const assignments = db.prepare(`
        SELECT pa.*, e.name as employee_name, e.role
        FROM production_assignments pa
        LEFT JOIN employees e ON pa.employee_id = e.id
        WHERE pa.order_id = ?
        ORDER BY pa.created_at DESC
      `).all(req.params.id) as any[];

      const nextStatusMap: Record<string, string> = {
        'En cuadro':      'En montaje',
        'En montaje':     'En impresión',
        'En impresión':   'En sublimación',
        'En sublimación': 'En corte',
        'En corte':       'En confección',
        'En empaque':     'En despacho',
      };

      const enriched = assignments.map(a => {
        const nextStatus = nextStatusMap[a.department];
        let duration_minutes: number | null = null;
        let completed_at: string | null = null;

        if (nextStatus) {
          const histEntry = db.prepare(`
            SELECT created_at FROM order_history
            WHERE order_id = ? AND action = 'Cambio de Estado'
              AND details LIKE ? AND created_at > ?
            ORDER BY created_at ASC LIMIT 1
          `).get(req.params.id, `%${nextStatus}%`, a.created_at) as any;

          if (histEntry) {
            completed_at = histEntry.created_at;
            duration_minutes = Math.round(
              (new Date(histEntry.created_at).getTime() - new Date(a.created_at).getTime()) / 60000
            );
          }
        }

        return { ...a, duration_minutes, completed_at };
      });

      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── Employees ─────────────────────────────────────────────────────────────

  app.get('/api/employees', (req, res) => {
    const query = req.query.includeInactive === 'true'
      ? 'SELECT * FROM employees ORDER BY name ASC'
      : 'SELECT * FROM employees WHERE active = 1 ORDER BY name ASC';
    res.json(db.prepare(query).all());
  });

  app.post('/api/employees', upload.single('photo'), (req: MulterRequest, res) => {
    const { name, role, phone, pin } = req.body;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : null;
    const info = db.prepare(
      'INSERT INTO employees (name, role, phone, pin, photo_path) VALUES (?, ?, ?, ?, ?)'
    ).run(name, role, phone, pin, photo_path);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/employees/:id', upload.single('photo'), (req: MulterRequest, res) => {
    const { name, role, phone, pin, active } = req.body;
    const photo_path = req.file ? `/uploads/${req.file.filename}` : undefined;
    const current = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Employee not found' });

    db.prepare(`
      UPDATE employees SET name=?, role=?, phone=?, pin=?, active=?, photo_path=? WHERE id=?
    `).run(
      name   ?? current.name,
      role   ?? current.role,
      phone  ?? current.phone,
      pin    ?? current.pin,
      active !== undefined ? (active === 'true' || active === true ? 1 : 0) : current.active,
      photo_path ?? current.photo_path,
      req.params.id,
    );
    res.json({ success: true });
  });

  // ─── Products ──────────────────────────────────────────────────────────────

  app.get('/api/products', (req, res) => {
    const query = req.query.includeInactive === 'true'
      ? 'SELECT * FROM products ORDER BY name'
      : 'SELECT * FROM products WHERE active = 1 ORDER BY name';
    res.json(db.prepare(query).all());
  });

  app.post('/api/products', (req, res) => {
    const {
      code, name, category, sewing_cost,
      price_filetes, price_despuntes, price_collarin, price_dobladillo_remate,
      price_filete_p, price_despuntes_p, price_caucho, price_sentar_caucho,
      price_collarin_p, price_remate,
    } = req.body;
    const info = db.prepare(`
      INSERT INTO products (
        code, name, category, sewing_cost,
        price_filetes, price_despuntes, price_collarin, price_dobladillo_remate,
        price_filete_p, price_despuntes_p, price_caucho, price_sentar_caucho,
        price_collarin_p, price_remate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code, name, category, sewing_cost || 0,
      price_filetes || 0, price_despuntes || 0, price_collarin || 0, price_dobladillo_remate || 0,
      price_filete_p || 0, price_despuntes_p || 0, price_caucho || 0, price_sentar_caucho || 0,
      price_collarin_p || 0, price_remate || 0,
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/products/:id', (req, res) => {
    const {
      code, name, category, sewing_cost, active,
      price_filetes, price_despuntes, price_collarin, price_dobladillo_remate,
      price_filete_p, price_despuntes_p, price_caucho, price_sentar_caucho,
      price_collarin_p, price_remate,
    } = req.body;
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Product not found' });

    db.prepare(`
      UPDATE products SET
        code=?, name=?, category=?, sewing_cost=?, active=?,
        price_filetes=?, price_despuntes=?, price_collarin=?, price_dobladillo_remate=?,
        price_filete_p=?, price_despuntes_p=?, price_caucho=?, price_sentar_caucho=?,
        price_collarin_p=?, price_remate=?
      WHERE id=?
    `).run(
      code          ?? current.code,
      name          ?? current.name,
      category      ?? current.category,
      sewing_cost   ?? current.sewing_cost,
      active !== undefined ? (active ? 1 : 0) : current.active,
      price_filetes           ?? current.price_filetes           ?? 0,
      price_despuntes         ?? current.price_despuntes         ?? 0,
      price_collarin          ?? current.price_collarin          ?? 0,
      price_dobladillo_remate ?? current.price_dobladillo_remate ?? 0,
      price_filete_p          ?? current.price_filete_p          ?? 0,
      price_despuntes_p       ?? current.price_despuntes_p       ?? 0,
      price_caucho            ?? current.price_caucho            ?? 0,
      price_sentar_caucho     ?? current.price_sentar_caucho     ?? 0,
      price_collarin_p        ?? current.price_collarin_p        ?? 0,
      price_remate            ?? current.price_remate            ?? 0,
      req.params.id,
    );
    res.json({ success: true });
  });

  // ─── Reports ───────────────────────────────────────────────────────────────

  app.get('/api/reports/employees', (_req, res) => {
    try {
      const report = db.prepare(`
        SELECT e.name as employee_name, e.role,
          SUM(pa.garment_count) as total_garments,
          SUM(pa.garment_count * pa.price_per_unit) as total_earned
        FROM employees e
        JOIN production_assignments pa ON e.id = pa.employee_id
        WHERE pa.created_at >= date('now', 'start of month')
        GROUP BY e.id
        ORDER BY total_earned DESC
      `).all();
      res.json(report);
    } catch {
      res.json([]);
    }
  });

  // ─── Orders ────────────────────────────────────────────────────────────────

  app.get('/api/orders', (req, res) => {
    const query = req.query.includeInactive === 'true'
      ? `SELECT o.*, t.name as team_name, o.is_reposition, o.reposition_reason
         FROM orders o LEFT JOIN teams t ON o.team_id = t.id ORDER BY o.created_at DESC`
      : `SELECT o.*, t.name as team_name, o.is_reposition, o.reposition_reason
         FROM orders o LEFT JOIN teams t ON o.team_id = t.id WHERE o.active = 1 ORDER BY o.created_at DESC`;

    const orders = db.prepare(query).all() as any[];
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    res.json(orders.map(order => ({ ...order, items: getItems.all(order.id) })));
  });

  app.get('/api/orders/:id/history', (req, res) => {
    res.json(
      db.prepare('SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id)
    );
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = db.prepare(`
      SELECT o.*, t.name as team_name, o.is_reposition, o.reposition_reason
      FROM orders o LEFT JOIN teams t ON o.team_id = t.id
      WHERE o.id = ?
    `).get(req.params.id) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items        = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    const versions     = db.prepare('SELECT * FROM design_versions WHERE order_id = ? ORDER BY version_number DESC').all(req.params.id);
    const references   = db.prepare('SELECT * FROM design_references WHERE order_id = ?').all(req.params.id);
    const history      = db.prepare('SELECT * FROM order_history WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id);
    const uniformZones = db.prepare('SELECT zone_id, file_path FROM uniform_zone_images WHERE order_id = ?').all(req.params.id) as any[];

    const uniform_zones: Record<string, string> = {};
    uniformZones.forEach(z => { uniform_zones[z.zone_id] = z.file_path; });

    res.json({ ...order, items, versions, references, history, uniform_zones });
  });

  app.post('/api/orders', (req, res) => {
    const {
      client_id, client_name, client_doc, client_doc_type, client_phone,
      client_address, client_city, contact_method, delivery_date,
      team_id, user_name, soligem_code, status, total_amount,
    } = req.body;
    const order_number = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const info = db.prepare(`
      INSERT INTO orders (
        order_number, client_id, client_name, client_doc, client_doc_type,
        client_phone, client_address, client_city, contact_method,
        delivery_date, team_id, soligem_code, status, total_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order_number, client_id, client_name, client_doc, client_doc_type,
      client_phone, client_address, client_city, contact_method,
      delivery_date, team_id, soligem_code || null, status, total_amount || 0,
    );
    const order_id = info.lastInsertRowid;
    db.prepare(
      'INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)'
    ).run(order_id, user_name || 'Sistema', 'Creación', `Orden ${order_number} creada`);
    res.json({ id: order_id, order_number });
  });

  app.put('/api/orders/:id', (req, res) => {
    const {
      client_id, client_name, client_doc, client_doc_type, client_phone,
      client_address, client_city, contact_method, delivery_date,
      items, active, team_id, user_name, soligem_code, status,
      is_reposition, reposition_reason, reposition_from_status, is_priority,
    } = req.body;
    const order_id = req.params.id;

    const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!current) return res.status(404).json({ error: 'Order not found' });

    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE orders SET
          client_id=?, client_name=?, client_doc=?, client_doc_type=?, client_phone=?,
          client_address=?, client_city=?, contact_method=?, delivery_date=?,
          active=?, team_id=?, soligem_code=?, status=?,
          is_reposition=?, reposition_reason=?, reposition_from_status=?, is_priority=?
        WHERE id=?
      `).run(
        client_id        ?? current.client_id,
        client_name      ?? current.client_name,
        client_doc       ?? current.client_doc,
        client_doc_type  ?? current.client_doc_type,
        client_phone     ?? current.client_phone,
        client_address   ?? current.client_address,
        client_city      ?? current.client_city,
        contact_method   ?? current.contact_method,
        delivery_date    ?? current.delivery_date,
        active !== undefined ? (active === 'true' || active === true ? 1 : 0) : current.active,
        team_id          ?? current.team_id,
        soligem_code     ?? current.soligem_code,
        status           ?? current.status,
        is_reposition !== undefined ? (is_reposition ? 1 : 0) : current.is_reposition,
        reposition_reason          ?? current.reposition_reason,
        reposition_from_status     ?? current.reposition_from_status,
        is_priority !== undefined ? (is_priority ? 1 : 0) : (current.is_priority ?? 0),
        order_id,
      );

      // ── FIX: persist items including the section field ──────────────────
      if (items !== undefined) {
        db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order_id);

        const insertItem = db.prepare(`
          INSERT INTO order_items (
            order_id, item_name, player_name, number, size, sleeve,
            design_type, fit, garment_type, observations,
            sewing_price, sale_price, design_path, active, section
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
          insertItem.run(
            order_id,
            item.item_name    || null,
            item.player_name  || null,
            item.number       || null,
            item.size         || null,
            item.sleeve       || null,
            item.design_type  || null,
            item.fit          || null,
            item.garment_type || null,
            item.observations || null,
            item.sewing_price || 0,
            item.sale_price   || 0,
            item.design_path  || null,
            item.active !== undefined ? (item.active ? 1 : 0) : 1,
            item.section      || 'uniforme',   // ← preserva sección
          );
        }
      }

      db.prepare(
        'INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)'
      ).run(order_id, user_name || 'Sistema', 'Actualización', 'Datos de la orden actualizados');
    });

    transaction();
    res.json({ success: true });
  });

  // ── POST /api/orders/:id/items — FIX: include section ─────────────────────
  app.post('/api/orders/:id/items', (req, res) => {
    const { items } = req.body;
    const order_id = req.params.id;

    const insert = db.prepare(`
      INSERT INTO order_items (
        order_id, item_name, player_name, number, size, sleeve,
        design_type, fit, garment_type, observations,
        sewing_price, sale_price, design_path, section
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items: any[]) => {
      const created = [];
      for (const item of items) {
        const info = insert.run(
          order_id,
          item.item_name    || null,
          item.player_name  || null,
          item.number       || null,
          item.size         || null,
          item.sleeve       || null,
          item.design_type  || null,
          item.fit          || null,
          item.garment_type || null,
          item.observations || null,
          item.sewing_price || 0,
          item.sale_price   || 0,
          item.design_path  || null,
          item.section      || 'uniforme',   // ← preserva sección
        );
        created.push({ id: info.lastInsertRowid, ...item });
      }
      return created;
    });

    res.json({ success: true, items: transaction(items) });
  });

  app.post('/api/orders/:id/status', (req, res) => {
    const { status, user_name, details_override } = req.body;
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    db.prepare(
      'INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)'
    ).run(
      req.params.id,
      user_name || 'Sistema',
      'Cambio de Estado',
      details_override || `Estado cambiado a: ${status}`,
    );
    res.json({ success: true });
  });

  // ─── Clients ───────────────────────────────────────────────────────────────

  app.get('/api/clients', (req, res) => {
    try {
      const query = req.query.includeInactive === 'true'
        ? `SELECT c.*, t.id as team_id, t.name as team_name
           FROM clients c LEFT JOIN teams t ON t.client_id = c.id ORDER BY c.name ASC`
        : `SELECT c.*, t.id as team_id, t.name as team_name
           FROM clients c LEFT JOIN teams t ON t.client_id = c.id
           WHERE c.active = 1 ORDER BY c.name ASC`;

      const rows = db.prepare(query).all() as any[];
      const map: Record<number, any> = {};

      for (const row of rows) {
        if (!map[row.id]) {
          map[row.id] = {
            id: row.id, name: row.name, doc: row.doc, doc_type: row.doc_type,
            phone: row.phone, address: row.address, city: row.city,
            email: row.email, active: row.active, teams: [],
          };
        }
        if (row.team_id) map[row.id].teams.push({ id: row.team_id, name: row.team_name });
      }

      res.json(Object.values(map));
    } catch (error: any) {
      res.status(500).json({ error: 'Error obteniendo clientes' });
    }
  });

  app.get('/api/clients/search', (req, res) => {
    const q = req.query.q;
    res.json(
      db.prepare(
        'SELECT * FROM clients WHERE active = 1 AND (name LIKE ? OR doc LIKE ?) LIMIT 10'
      ).all(`%${q}%`, `%${q}%`)
    );
  });

  app.post('/api/clients', (req, res) => {
    const { name, doc, doc_type, phone, address, city, email } = req.body;
    try {
      const info = db.prepare(
        'INSERT INTO clients (name, doc, doc_type, phone, address, city, email) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(name, doc, doc_type, phone, address, city, email);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    const { name, doc, doc_type, phone, address, city, email, active } = req.body;
    const current = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Client not found' });

    db.prepare(`
      UPDATE clients SET name=?, doc=?, doc_type=?, phone=?, address=?, city=?, email=?, active=?
      WHERE id=?
    `).run(
      name     ?? current.name,
      doc      ?? current.doc,
      doc_type ?? current.doc_type,
      phone    ?? current.phone,
      address  ?? current.address,
      city     ?? current.city,
      email    ?? current.email,
      active !== undefined ? (active === 'true' || active === true ? 1 : 0) : current.active,
      req.params.id,
    );
    res.json({ success: true });
  });

  // ─── Teams ─────────────────────────────────────────────────────────────────

  app.get('/api/clients/:id/teams', (req, res) => {
    res.json(
      db.prepare('SELECT * FROM teams WHERE client_id = ? AND active = 1 ORDER BY name ASC').all(req.params.id)
    );
  });

  app.post('/api/clients/:id/teams', (req, res) => {
    const { name } = req.body;
    const info = db.prepare('INSERT INTO teams (client_id, name) VALUES (?, ?)').run(req.params.id, name);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/teams/:id', (req, res) => {
    const { name, active } = req.body;
    const current = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id) as any;
    if (!current) return res.status(404).json({ error: 'Team not found' });

    db.prepare('UPDATE teams SET name=?, active=? WHERE id=?').run(
      name   ?? current.name,
      active !== undefined ? (active ? 1 : 0) : current.active,
      req.params.id,
    );
    res.json({ success: true });
  });

  // ─── Design ────────────────────────────────────────────────────────────────

  app.post('/api/design-versions/:id/status', (req, res) => {
    const { status, client_comments, order_id, user_name } = req.body;
    db.prepare('UPDATE design_versions SET status=?, client_comments=? WHERE id=?').run(status, client_comments, req.params.id);
    db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, order_id);

    const action  = status === 'Diseño aprobado' ? 'Diseño Aprobado' : 'Corrección Solicitada';
    const details = status === 'Diseño aprobado'
      ? 'El cliente aprobó el diseño.'
      : `El cliente solicitó correcciones: ${client_comments}`;

    db.prepare(
      'INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)'
    ).run(order_id, user_name || 'Cliente', action, details);
    res.json({ success: true });
  });

  app.post('/api/orders/:id/design-version', upload.single('design'), (req: MulterRequest, res) => {
    const { version_number, comments, created_by, status } = req.body;
    const file_path = req.file ? `/uploads/${req.file.filename}` : null;

    db.prepare(`
      INSERT INTO design_versions (order_id, version_number, file_path, comments, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, version_number, file_path, comments, created_by, status);

    db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, req.params.id);
    db.prepare(
      'INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)'
    ).run(
      req.params.id, created_by || 'Sistema',
      'Nueva Versión Diseño', `Versión ${version_number} cargada. Estado: ${status}`,
    );
    res.json({ success: true });
  });

  app.post('/api/orders/:id/references', upload.array('references'), (req: MulterRequest, res) => {
    const { uploaded_by, comments } = req.body;
    const files = req.files as Express.Multer.File[];

    const insert = db.prepare(
      'INSERT INTO design_references (order_id, file_path, file_type, uploaded_by, comments) VALUES (?, ?, ?, ?, ?)'
    );
    for (const file of files) {
      insert.run(req.params.id, `/uploads/${file.filename}`, file.mimetype, uploaded_by, comments);
    }

    db.prepare(
      'INSERT INTO order_history (order_id, user_name, action, details) VALUES (?, ?, ?, ?)'
    ).run(
      req.params.id, uploaded_by || 'Sistema',
      'Carga Referencias', `${files.length} archivos de referencia cargados`,
    );
    res.json({ success: true });
  });

  // ─── Uniform zones ─────────────────────────────────────────────────────────

  app.post('/api/orders/:id/uniform-zone', upload.single('image'), (req: MulterRequest, res) => {
    const { zone_id } = req.body;
    const file_path   = req.file ? `/uploads/${req.file.filename}` : null;
    if (!zone_id || !file_path) return res.status(400).json({ error: 'zone_id e image son requeridos' });

    const existing = db.prepare(
      'SELECT id FROM uniform_zone_images WHERE order_id = ? AND zone_id = ?'
    ).get(req.params.id, zone_id);

    if (existing) {
      db.prepare(
        'UPDATE uniform_zone_images SET file_path=? WHERE order_id=? AND zone_id=?'
      ).run(file_path, req.params.id, zone_id);
    } else {
      db.prepare(
        'INSERT INTO uniform_zone_images (order_id, zone_id, file_path) VALUES (?, ?, ?)'
      ).run(req.params.id, zone_id, file_path);
    }

    res.json({ success: true, file_path });
  });

  app.delete('/api/orders/:id/uniform-zone/:zone_id', (req, res) => {
    db.prepare(
      'DELETE FROM uniform_zone_images WHERE order_id=? AND zone_id=?'
    ).run(req.params.id, req.params.zone_id);
    res.json({ success: true });
  });

  // ─── Stats ─────────────────────────────────────────────────────────────────

  app.get('/api/stats', (_req, res) => {
    const activeOrders  = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE active=1 AND status!='Entregado' AND status!='Devuelto'").get() as any).count;
    const delayedOrders = (db.prepare("SELECT COUNT(*) as count FROM orders WHERE active=1 AND delivery_date < date('now') AND status!='Entregado'").get() as any).count;
    res.json({ activeOrders, delayedOrders });
  });

  // ─── Fallbacks ─────────────────────────────────────────────────────────────

  app.all('/api/*', (_req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  // ─── Vite / Static ─────────────────────────────────────────────────────────

  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();