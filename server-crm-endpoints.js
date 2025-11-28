import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ============= CONTACTOS =============

// GET: Obtener todos los contactos
app.get('/api/contacts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Obtener contacto por ID
app.get('/api/contacts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'Contacto no encontrado' });
  }
});



// GET: Obtener contacto por TELEFONO
app.get('/api/contacts/phone/:phone', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', req.params.phone)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'Contacto no encontrado' });
  }
});

// POST: Crear contacto
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, company, position } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Nombre y teléfono requeridos' });
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert([{
        id: Math.random().toString(36).substring(2, 15),
        name,
        email,
        phone: phone || '',
        company: company || '',
        position: position || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Actualizar contacto
app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        ...req.body,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Eliminar contacto
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await supabase.from('contacts').delete().eq('id', req.params.id);
    res.json({ message: 'Contacto eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= OPORTUNIDADES (DEALS) =============

// GET: Obtener todas las oportunidades
app.get('/api/deals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Crear oportunidad
app.post('/api/deals', async (req, res) => {
  try {
    const { title, value, stage, contactId, probability, expectedCloseDate } = req.body;

    if (!title || !contactId) {
      return res.status(400).json({ error: 'Título y contactoId requeridos' });
    }

    const { data, error } = await supabase
      .from('deals')
      .insert([{
        id: Math.random().toString(36).substring(2, 15),
        title,
        value: value || 0,
        stage: stage || 'lead',
        contactId,
        probability: probability || 20,
        expectedCloseDate: expectedCloseDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Actualizar etapa de oportunidad
app.put('/api/deals/:id/stage', async (req, res) => {
  try {
    const { stage } = req.body;

    const { data, error } = await supabase
      .from('deals')
      .update({
        stage,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= TAREAS =============

// GET: Obtener todas las tareas
app.get('/api/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('dueDate', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Crear tarea
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, dueDate, priority, contactId, dealId } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ error: 'Título y fecha requeridos' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        id: Math.random().toString(36).substring(2, 15),
        title,
        description: description || '',
        dueDate,
        priority: priority || 'medium',
        completed: false,
        contactId: contactId || null,
        dealId: dealId || null,
        createdAt: new Date().toISOString(),
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Marcar tarea como completada
app.put('/api/tasks/:id/toggle', async (req, res) => {
  try {
    // Obtener el estado actual
    const { data: current } = await supabase
      .from('tasks')
      .select('completed')
      .eq('id', req.params.id)
      .single();

    const { data, error } = await supabase
      .from('tasks')
      .update({ completed: !current.completed })
      .eq('id', req.params.id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ACTIVIDADES =============

// GET: Obtener todas las actividades
app.get('/api/activities', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= SALUD DEL SERVIDOR =============

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
  console.log(`📚 Documentación: http://localhost:${PORT}/health`);
});

export default app;
