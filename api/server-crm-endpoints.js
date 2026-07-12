import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

// Inicializar Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);


app.use(cors({
  origin: '*', // para probar
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============= SWAGGER DOCS =============
try {
  const swaggerPath = path.join(process.cwd(), 'api', 'swagger.json');
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

  const swaggerOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js'
    ]
  };

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
} catch (error) { }


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
    console.log('telefono', req.params.phone)
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', req.params.phone)


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

    // 🚀 Aquí agregamos el envío al webhook de n8n 
    const n8nUrl = process.env.N8N_NEW_LEAD_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wa_id: phone,
          name,
          email,
          company,
          position,
          message: `Nuevo lead registrado: ${name} (${phone})`
        })
      }).catch(err => console.error('Error enviando a n8n:', err));
    }

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// POST: Agente acepta un chat de la cola
app.post('/api/chats/:id/accept', async (req, res) => {
  try {
    const { agentId } = req.body;
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        agent_id: agentId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // 🆕 Marcar el lead correspondiente como "contactado"
    const { data: leadMatch } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', data.wa_id)
      .neq('status', 'contactado')
      .maybeSingle();

    if (leadMatch) {
      await supabase
        .from('leads')
        .update({
          status: 'contactado',
          message_sent: 'Agente aceptó el chat',
          updatedAt: new Date().toISOString(),
        })
        .eq('id', leadMatch.id);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Actualizar estado del lead a "contactado"
app.put('/api/leads/:id/contacted', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({
        status: 'contactado',
        message_sent: req.body.message || 'Lead marcado como contactado',
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

// POST: Crear actividad
app.post('/api/activities', async (req, res) => {
  try {
    const { type, description, contactId, dealId } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: 'Tipo y descripción requeridos' });
    }

    const { data, error } = await supabase
      .from('activities')
      .insert([{
        type,
        description,
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




// ============= CHAT & COLA DE AGENTES (WHATSAPP) =============

// POST: Recibir mensaje desde n8n
app.post('/api/webhook/whatsapp', async (req, res) => {
  try {
    const { wa_id, name, message, timestamp, manychat_id, escalate } = req.body;

    if (!wa_id || !message) {
      return res.status(400).json({ error: 'wa_id y message son requeridos' });
    }

    // Buscar la sesión no cerrada más reciente (evita crash si hay duplicados viejos)
    const { data: sessions, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('wa_id', wa_id)
      .neq('status', 'closed')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sessionError) throw sessionError;
    let session = sessions && sessions.length > 0 ? sessions[0] : null;

    if (!session) {
      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert([{
          wa_id,
          customer_name: name || 'Cliente WhatsApp',
          status: escalate ? 'pending' : 'bot',   // 👈 clave del fix
          last_message: message,
          manychat_id: manychat_id || null,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) throw createError;
      session = newSession;
    } else {
      const updateData = {
        last_message: message,
        manychat_id: manychat_id || session.manychat_id,
        updated_at: new Date().toISOString()
      };
      // Solo escalamos de 'bot' a 'pending'; nunca bajamos 'active'/'pending'
      if (escalate && session.status === 'bot') {
        updateData.status = 'pending';
        session.status = 'pending';
      }
      await supabase.from('chat_sessions').update(updateData).eq('id', session.id);
    }

    const { error: msgError } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: session.id,
        sender_id: wa_id,
        sender_type: 'customer',
        content: message,
        created_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      }]);

    if (msgError) throw msgError;

    res.json({ success: true, sessionId: session.id, status: session.status });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: error.message });
  }
});


// GET: Obtener cola de chats (solo lo que el agente debe ver)
app.get('/api/chats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .in('status', ['pending', 'active'])   // 👈 ya no muestra conversaciones solo-bot
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Agente acepta un chat de la cola
app.post('/api/chats/:id/accept', async (req, res) => {
  try {
    const { agentId } = req.body;
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        agent_id: agentId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Obtener mensajes de una sesión
app.get('/api/chats/:id/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// POST: Agente envía un mensaje
app.post('/api/chats/:id/send', async (req, res) => {
  try {
    const { content, agentId } = req.body;

    // 1. Obtener la sesión (con manychat_id)
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('wa_id, manychat_id')
      .eq('id', req.params.id)
      .single();

    if (sessionError) throw sessionError;

    // 1.b Obtener el último mensaje del CLIENTE (no del agente) para
    // saber si sigue dentro de la ventana de 24h de WhatsApp
    const { data: lastCustomerMsg } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('session_id', req.params.id)
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Guardar mensaje
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        session_id: req.params.id,
        sender_id: agentId,
        sender_type: 'agent',
        content: content
      }])
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('chat_sessions')
      .update({
        last_message: content,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    // 3. Llamar a n8n, incluyendo la fecha del último mensaje del cliente
    const n8nUrl = process.env.N8N_WHATSAPP_SEND_URL;
    if (n8nUrl) {
      try {
        const n8nResp = await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wa_id: session.wa_id,
            manychat_id: session.manychat_id,
            message: content,
            last_customer_message_at: lastCustomerMsg ? lastCustomerMsg.created_at : null
          })
        });
        if (!n8nResp.ok) console.error('n8n respondió error:', n8nResp.status, await n8nResp.text());
      } catch (n8nErr) {
        console.error('Error enviando a n8n:', n8nErr);
      }
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Finalizar un chat
app.post('/api/chats/:id/close', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Chat cerrado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Consultar si un cliente tiene chat activo/en cola (para n8n)
app.get('/api/chats/status/:wa_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('status')
      .eq('wa_id', req.params.wa_id)
      .in('status', ['pending', 'active'])   // 👈 'bot' ya NO cuenta como activo
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    const hasActiveChat = data && data.length > 0;
    res.json({ hasActiveChat, status: hasActiveChat ? data[0].status : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// ============= SALUD DEL SERVIDOR =============

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;