// Vercel Serverless Function: /api/empresas
// Shared empresas storage using Vercel KV (Redis)
// Enable Vercel KV in Vercel Dashboard → Storage → Create Database → KV

import { kv } from '@vercel/kv';

const KEY = 'empresas:v1';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  try {
    // GET - list all empresas
    if (req.method === 'GET') {
      const data = await kv.get(KEY) || [];
      return res.status(200).setHeader('Content-Type', 'application/json').json(data);
    }

    // POST - create new empresa
    if (req.method === 'POST') {
      const empresas = await kv.get(KEY) || [];
      const nova = { ...req.body, id: req.body.id || `e${Date.now()}` };
      empresas.push(nova);
      await kv.set(KEY, empresas);
      return res.status(201).json(nova);
    }

    // PUT - update empresa (expects ?id=...)
    if (req.method === 'PUT') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      const empresas = await kv.get(KEY) || [];
      const idx = empresas.findIndex(e => e.id === id);
      if (idx === -1) return res.status(404).json({ error: 'not found' });
      empresas[idx] = { ...empresas[idx], ...req.body, id };
      await kv.set(KEY, empresas);
      return res.status(200).json(empresas[idx]);
    }

    // DELETE - remove empresa (expects ?id=...)
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });
      let empresas = await kv.get(KEY) || [];
      empresas = empresas.filter(e => e.id !== id);
      await kv.set(KEY, empresas);
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
}