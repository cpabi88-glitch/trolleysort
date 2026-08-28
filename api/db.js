import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action, table, data, id, field, value } = req.body || {};

  try {
    // Setup tables on first run
    await sql`
      CREATE TABLE IF NOT EXISTS master_items (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        shop TEXT NOT NULL DEFAULT 'Asda',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS week_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        checked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    if (action === 'get') {
      if (table === 'master_items') {
        const rows = await sql`SELECT * FROM master_items ORDER BY position ASC`;
        return res.status(200).json(rows);
      }
      if (table === 'week_items') {
        const rows = await sql`SELECT * FROM week_items ORDER BY created_at ASC`;
        return res.status(200).json(rows);
      }
    }

    if (action === 'insert') {
      if (table === 'master_items') {
        const { name, position, shop } = data;
        const rows = await sql`
          INSERT INTO master_items (name, position, shop)
          VALUES (${name}, ${position}, ${shop})
          RETURNING *
        `;
        return res.status(200).json(rows[0]);
      }
      if (table === 'week_items') {
        const { name } = data;
        const rows = await sql`
          INSERT INTO week_items (name, checked)
          VALUES (${name}, FALSE)
          RETURNING *
        `;
        return res.status(200).json(rows[0]);
      }
    }

    if (action === 'update') {
      if (table === 'master_items') {
        const { position, shop, name } = data;
        if (position !== undefined && shop !== undefined) {
          await sql`UPDATE master_items SET position=${position}, shop=${shop} WHERE id=${id}`;
        } else if (position !== undefined) {
          await sql`UPDATE master_items SET position=${position} WHERE id=${id}`;
        } else if (name !== undefined) {
          await sql`UPDATE master_items SET name=${name} WHERE id=${id}`;
        }
        return res.status(200).json({ ok: true });
      }
      if (table === 'week_items') {
        const { checked } = data;
        await sql`UPDATE week_items SET checked=${checked} WHERE id=${id}`;
        return res.status(200).json({ ok: true });
      }
    }

    if (action === 'delete') {
      if (table === 'master_items') {
        await sql`DELETE FROM master_items WHERE id=${id}`;
        return res.status(200).json({ ok: true });
      }
      if (table === 'week_items') {
        await sql`DELETE FROM week_items WHERE id=${id}`;
        return res.status(200).json({ ok: true });
      }
    }

    if (action === 'deleteAll') {
      await sql`DELETE FROM week_items`;
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
