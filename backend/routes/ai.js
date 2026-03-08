// routes/ai.js
const express = require('express');
const router  = express.Router();
const db      = require('../database/connection');
const fetch   = require('node-fetch');

const SYSTEM_PROMPT = `You are IronCore ERP's expert support agent. You help gym software support staff resolve technical and business issues raised by gym owners.

You have deep knowledge of:
- IronCore ERP modules: CRM, Billing, Attendance, Classes, POS, Inventory, Reports, Website, Mobile App, API
- Subscription plans: Starter (Rs 1500/mo, 100 members), Pro (Rs 3000/mo, 300 members), Elite (Rs 5500/mo, 600 members), Enterprise (Rs 12000/mo, unlimited)
- Common gym management software issues
- Indian gym business context

When responding:
1. Acknowledge the issue clearly and warmly
2. Provide step-by-step solution
3. If feature not in their plan, mention upgrade path
4. Be professional, concise and helpful
5. Sign off as "IronCore Support Team"`;

// ── AI SOLVE TICKET ─────────────────────────────────
router.post('/solve/:ticketId', async (req, res) => {
  try {
    const { messages } = req.body;

    const ticket = db.prepare(`
      SELECT t.*, g.name as gym_name, g.owner as gym_owner, g.email as gym_email,
             g.plan as gym_plan, g.city as gym_city, g.state as gym_state,
             g.members as gym_members, g.max_members as gym_max_members, g.status as gym_status
      FROM tickets t LEFT JOIN gyms g ON t.gym_id = g.id WHERE t.id = ?`).get(req.params.ticketId);

    if (!ticket) return res.status(404).json({ success: false, error: 'Ticket not found' });

    let gymModules = [];
    if (ticket.gym_id) {
      gymModules = db.prepare('SELECT module_key FROM gym_modules WHERE gym_id = ? AND enabled = 1')
        .all(ticket.gym_id).map(m => m.module_key);
    }

    const gymContext = ticket.gym_name ? `
Gym: ${ticket.gym_name} (${ticket.gym_city || ''}, ${ticket.gym_state || ''})
Owner: ${ticket.gym_owner} (${ticket.gym_email})
Plan: ${ticket.gym_plan}
Active Modules: ${gymModules.join(', ') || 'none'}
Members: ${ticket.gym_members}/${ticket.gym_max_members}
Account Status: ${ticket.gym_status}` : 'Gym info unavailable';

    const ticketContext = `Support ticket from gym owner:
${gymContext}

Ticket ID: ${ticket.id}
Subject: ${ticket.subject}
Priority: ${ticket.priority}
Description: ${ticket.description || 'No details provided.'}

Please analyze and draft a helpful reply to send to the gym owner.`;

    let chatMessages = messages && messages.length > 0
      ? messages
      : [{ role: 'user', content: ticketContext }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: chatMessages
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ success: false, error: data.error.message });
    }

    const reply = data.content?.[0]?.text || 'Could not generate response.';

    db.prepare(`UPDATE tickets SET status='in-progress', assignee='AI Agent', updated_at=datetime('now') WHERE id=? AND status='open'`)
      .run(req.params.ticketId);

    res.json({
      success: true,
      data: {
        reply,
        ticketId: req.params.ticketId,
        gymContext: {
          name: ticket.gym_name,
          owner: ticket.gym_owner,
          email: ticket.gym_email,
          plan: ticket.gym_plan,
          modules: gymModules
        }
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── AI FOLLOW-UP QUESTION ───────────────────────────
router.post('/followup/:ticketId', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages required' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT + '\nBe concise and practical.',
        messages
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'No response.';
    res.json({ success: true, data: { reply } });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SEND REPLY & UPDATE TICKET ──────────────────────
router.post('/send/:ticketId', (req, res) => {
  try {
    const { reply, resolve } = req.body;
    const newStatus = resolve ? 'resolved' : 'in-progress';
    db.prepare(`UPDATE tickets SET status=?, last_reply=?, assignee='AI Agent', updated_at=datetime('now') WHERE id=?`)
      .run(newStatus, reply, req.params.ticketId);

    const ticket = db.prepare('SELECT subject, gym_id FROM tickets WHERE id = ?').get(req.params.ticketId);
    db.prepare('INSERT INTO activity_log (icon, message, gym_id) VALUES (?,?,?)').run(resolve ? '✅' : '💬', `Ticket ${req.params.ticketId} ${resolve ? 'resolved' : 'replied'}: ${ticket?.subject || ''}`, ticket?.gym_id || null);

    res.json({ success: true, message: resolve ? 'Ticket resolved and reply sent' : 'Reply sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
