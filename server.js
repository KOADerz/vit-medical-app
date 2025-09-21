const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000; // UPDATED: Dynamic port for Railway
const DB_FILE = './consultations.json';

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files like index.html from 'public' folder if you have one. If not, this is safe to keep.


// NEW ENDPOINT for secure AI chat
app.post('/api/chat', async (req, res) => {
  const { conversationHistory } = req.body;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ message: "Server is not configured with an API key." });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: conversationHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return res.status(response.status).json({ message: 'Error from OpenAI API' });
    }

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error('Server Chat Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


app.get('/api/get-consultations', (req, res) => {
  fs.readFile(DB_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.status(200).json(JSON.parse(data));
  });
});

app.post('/api/submit-consultation', (req, res) => {
  fs.readFile(DB_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    const consultations = JSON.parse(data);

    const newConsultation = {
      id: Date.now(),
      receivedAt: new Date(),
      studentName: req.body.nameInput,
      studentId: req.body.IdInput,
      symptoms: req.body.symptomsInput,
      status: 'pending',
      paymentStatus: 'n/a',
      response: null,
      deliveryDetails: null
    };

    consultations.unshift(newConsultation);

    fs.writeFile(DB_FILE, JSON.stringify(consultations, null, 2), (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.status(201).json({ message: 'Consultation received' });
    });
  });
});

app.post('/api/respond/:id', (req, res) => {
  const consultationId = parseInt(req.params.id);
  const { diagnosis, medicine, price } = req.body;

  fs.readFile(DB_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    let consultations = JSON.parse(data);
    const index = consultations.findIndex(c => c.id === consultationId);

    if (index === -1) return res.status(404).json({ message: 'Not found' });

    consultations[index].status = 'completed';
    consultations[index].paymentStatus = 'pending';
    consultations[index].response = {
      diagnosis, medicine, price, respondedAt: new Date()
    };

    fs.writeFile(DB_FILE, JSON.stringify(consultations, null, 2), (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.status(200).json({ message: 'Response submitted' });
    });
  });
});


app.post('/api/confirm-payment/:id', (req, res) => {
  const consultationId = parseInt(req.params.id);
  const { hostelType, hostelBlock, roomNumber } = req.body;

  fs.readFile(DB_FILE, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    let consultations = JSON.parse(data);
    const index = consultations.findIndex(c => c.id === consultationId);
    
    if (index === -1) return res.status(404).json({ message: 'Not found' });

    consultations[index].paymentStatus = 'paid';
    consultations[index].deliveryDetails = {
      hostelType, hostelBlock, roomNumber
    };

    fs.writeFile(DB_FILE, JSON.stringify(consultations, null, 2), (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.status(200).json({ message: 'Payment confirmed' });
    });
  });
});


app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});