import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT NOT NULL UNIQUE,
        value JSONB NOT NULL,
        updated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_daily_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        check_date DATE NOT NULL,
        check_type TEXT NOT NULL CHECK (check_type IN ('opening','closing')),
        location TEXT,
        main_worker_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        main_worker_name TEXT,
        assistant_worker_name TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','completed','corrected')),
        completed_at TIMESTAMPTZ,
        completed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        notes TEXT,
        locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_daily_checks_date ON haccp_daily_checks(check_date)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_daily_check_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        check_id UUID NOT NULL REFERENCES haccp_daily_checks(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        item_label TEXT NOT NULL,
        result TEXT NOT NULL DEFAULT 'ok' CHECK (result IN ('ok','nok','na')),
        note TEXT,
        sort_order INT NOT NULL DEFAULT 0
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_check_items_check ON haccp_daily_check_items(check_id)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_temperature_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_date DATE NOT NULL,
        record_time TIME,
        equipment_id UUID,
        equipment_name TEXT NOT NULL,
        measured_temp NUMERIC(5,2) NOT NULL,
        temp_min NUMERIC(5,2),
        temp_max NUMERIC(5,2),
        result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('ok','below_limit','above_limit','unconfigured','pending')),
        employee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        employee_name TEXT,
        corrective_action TEXT,
        non_conformity_id UUID,
        notes TEXT,
        locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_temps_date ON haccp_temperature_records(record_date)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_equipment (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        temp_min NUMERIC(5,2),
        temp_max NUMERIC(5,2),
        active BOOLEAN NOT NULL DEFAULT true,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`
      INSERT INTO haccp_equipment (name, temp_min, temp_max, sort_order) VALUES
        ('Chladnička', 1, 8, 1),
        ('Chladiaci box', 1, 8, 2),
        ('Mrazák', -22, -15, 3)
      ON CONFLICT DO NOTHING
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_sanitation_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_date DATE NOT NULL,
        record_time TIME,
        area TEXT NOT NULL,
        cleaning_action TEXT,
        product_used TEXT,
        concentration TEXT,
        employee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        employee_name TEXT,
        result TEXT NOT NULL DEFAULT 'ok' CHECK (result IN ('ok','nok','partial')),
        notes TEXT,
        locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_san_date ON haccp_sanitation_records(record_date)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_water_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_date DATE NOT NULL,
        location TEXT,
        water_source TEXT,
        amount_filled_l NUMERIC(6,1),
        clean_tank_checked BOOLEAN NOT NULL DEFAULT false,
        clean_tank_sanitized BOOLEAN NOT NULL DEFAULT false,
        waste_tank_checked BOOLEAN NOT NULL DEFAULT false,
        waste_disposed BOOLEAN NOT NULL DEFAULT false,
        disposal_location TEXT,
        employee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        employee_name TEXT,
        notes TEXT,
        locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_water_date ON haccp_water_records(record_date)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        legal_name TEXT,
        ico TEXT,
        address TEXT,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        categories TEXT[],
        approved BOOLEAN NOT NULL DEFAULT false,
        active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`
      INSERT INTO haccp_suppliers (name, categories, active, notes) VALUES
        ('METRO', ARRAY['Potraviny','Obaly','Chémia'], true, 'Veľkoobchod – právne údaje doplniť.'),
        ('KOS', ARRAY['Potraviny'], true, 'Právne údaje doplniť.'),
        ('Dodávateľ pitnej vody', ARRAY['Voda'], true, 'Právne údaje doplniť.'),
        ('Helou, s.r.o.', ARRAY['Potraviny'], true, '')
      ON CONFLICT DO NOTHING
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_receiving_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        supplier_id UUID REFERENCES haccp_suppliers(id) ON DELETE SET NULL,
        supplier_name TEXT,
        product TEXT NOT NULL,
        quantity TEXT,
        lot_batch TEXT,
        expiry_date DATE,
        temperature NUMERIC(5,2),
        package_condition TEXT NOT NULL DEFAULT 'ok' CHECK (package_condition IN ('ok','damaged','rejected')),
        accepted BOOLEAN NOT NULL DEFAULT true,
        rejection_reason TEXT,
        received_by_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        received_by_name TEXT,
        invoice_ref TEXT,
        notes TEXT,
        locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_recv_date ON haccp_receiving_records(received_at)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_discard_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_date DATE NOT NULL,
        product TEXT NOT NULL,
        quantity TEXT,
        reason TEXT NOT NULL,
        expiry_date DATE,
        disposal_method TEXT,
        employee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        employee_name TEXT,
        notes TEXT,
        locked BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_discard_date ON haccp_discard_records(record_date)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_non_conformities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        affected_product TEXT,
        lot_batch TEXT,
        severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
        immediate_action TEXT,
        corrective_action TEXT,
        responsible_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        responsible_name TEXT,
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','closed','archived')),
        closed_at TIMESTAMPTZ,
        closure_note TEXT,
        source TEXT,
        source_record_id UUID,
        archived BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_nc_status ON haccp_non_conformities(status)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_pest_control_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_date DATE NOT NULL,
        area TEXT NOT NULL,
        finding TEXT,
        evidence_found BOOLEAN NOT NULL DEFAULT false,
        action_taken TEXT,
        responsible_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        responsible_name TEXT,
        status TEXT NOT NULL DEFAULT 'inspected' CHECK (status IN ('inspected','action_required','closed')),
        closed_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_maintenance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_date DATE NOT NULL,
        equipment TEXT NOT NULL,
        description TEXT NOT NULL,
        performed_by TEXT,
        result TEXT,
        next_service_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_maint_next ON haccp_maintenance_records(next_service_date)`)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        brand TEXT,
        supplier_id UUID REFERENCES haccp_suppliers(id) ON DELETE SET NULL,
        supplier_name TEXT,
        category TEXT NOT NULL DEFAULT 'Other',
        storage_requirement TEXT,
        storage_after_opening TEXT,
        expiry_rule TEXT,
        active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_ingredient_allergens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingredient_id UUID NOT NULL REFERENCES haccp_ingredients(id) ON DELETE CASCADE,
        allergen_number INT NOT NULL CHECK (allergen_number BETWEEN 1 AND 14),
        presence TEXT NOT NULL DEFAULT 'contains' CHECK (presence IN ('contains','may_contain','free')),
        notes TEXT,
        UNIQUE(ingredient_id, allergen_number)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT,
        serving_size TEXT,
        preparation_notes TEXT,
        allergen_override JSONB,
        allergen_override_reason TEXT,
        allergen_override_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        allergen_override_at TIMESTAMPTZ,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_recipe_ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id UUID NOT NULL REFERENCES haccp_recipes(id) ON DELETE CASCADE,
        ingredient_id UUID REFERENCES haccp_ingredients(id) ON DELETE SET NULL,
        ingredient_name TEXT NOT NULL,
        quantity TEXT,
        sort_order INT NOT NULL DEFAULT 0
      )
    `)

    const seedRecipes = [
      ['Espresso','Coffee'],['Americano','Coffee'],['Cappuccino','Coffee'],
      ['Latte','Coffee'],['Flat White','Coffee'],['Lamaccino','Signature'],
      ['Golden Latte','Signature'],['Golden Milk Latte','Signature'],
      ['LaMatcha','Matcha'],['Iced LaMatcha','Matcha'],
      ['Chocolama','Chocolate'],['Dirty Chocolama','Chocolate'],
      ['Iced Chocolama','Chocolate'],['Golden Elixir','Signature'],
      ['Lama Morada','Signature'],['Passion Lama','Lemonade'],
      ['Camu Citrus','Lemonade'],
    ]
    for (const [name, category] of seedRecipes) {
      await client.query(
        `INSERT INTO haccp_recipes (name, category) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [name, category]
      )
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_training_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        employee_name TEXT NOT NULL,
        topic TEXT NOT NULL,
        training_date DATE NOT NULL,
        trainer TEXT,
        confirmed BOOLEAN NOT NULL DEFAULT false,
        confirmed_by_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        confirmed_at TIMESTAMPTZ,
        next_retraining_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_manual_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        issue_date DATE,
        effective_date DATE,
        status TEXT NOT NULL DEFAULT 'draft'
          CHECK (status IN ('draft','review','active','archived')),
        document_url TEXT,
        approved_by TEXT,
        ruv_status TEXT NOT NULL DEFAULT 'unconsulted'
          CHECK (ruv_status IN ('unconsulted','consulted','requires_update','approved')),
        notes TEXT,
        created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS haccp_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id UUID,
        action TEXT NOT NULL,
        user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        user_name TEXT,
        old_values JSONB,
        new_values JSONB,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_audit_entity ON haccp_audit_log(entity_type, entity_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_haccp_audit_created ON haccp_audit_log(created_at)`)

    await client.query('COMMIT')
    console.log('HACCP migration completed successfully.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration failed, rolled back:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
