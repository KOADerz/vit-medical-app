document.addEventListener('DOMContentLoaded', () => {
  const studentForm = document.getElementById('studentForm');
  const messageDiv = document.getElementById('formMessage');
  const consultationsGrid = document.getElementById('consultationsGrid');
  const paymentOverlay = document.getElementById('payment-modal-overlay');
  const paymentForm = document.getElementById('payment-form');
  const paymentCancelBtn = document.getElementById('payment-cancel-btn');
  const paymentConsultationIdInput = document.getElementById('payment-consultation-id');

  const chatWidget = document.getElementById('ai-chat-widget');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatForm = document.getElementById('chat-form');
  const chatCloseBtn = document.getElementById('chat-close-btn');
  
  // REMOVED: API key is no longer stored in the frontend
  let conversationHistory = [];

  const createConsultationCard = (consultation) => {
    const card = document.createElement('div');
    card.classList.add('consultation-card');
    card.dataset.id = consultation.id; 
    const submissionTime = new Date(consultation.receivedAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let statusHTML = '';

    if (consultation.status === 'pending') {
      statusHTML = `<p class="consultation-status">Status: Pending doctor's response</p>`;
    } else if (consultation.status === 'completed' && consultation.paymentStatus === 'pending') {
      statusHTML = `
        <div class="doctor-response">
          <strong>Diagnosis:</strong> ${consultation.response.diagnosis}<br>
          <strong>Medicine:</strong> ${consultation.response.medicine}<br>
          <strong>Fee:</strong> ₹${consultation.response.price}
        </div>
        <button class="payment-btn">Proceed to Payment and Delivery</button>
      `;
    } else if (consultation.paymentStatus === 'paid') {
      statusHTML = `
        <div class="doctor-response">
          <strong>Diagnosis:</strong> ${consultation.response.diagnosis}<br>
          <strong>Medicine:</strong> ${consultation.response.medicine}<br>
          <strong>Fee:</strong> ₹${consultation.response.price}
        </div>
        <div class="final-status">
          <p>✅ Payment Successful</p>
          <p>🚚 Your medicine is being prepared for delivery.</p>
        </div>
      `;
    }

    card.innerHTML = `
      <h3 class="consultation-title">${consultation.symptoms}</h3>
      <p class="consultation-time">${submissionTime}</p>
      ${statusHTML}
    `;
    return card;
  };

  const loadPastConsultations = async () => {
    try {
      const response = await fetch('/api/get-consultations'); // UPDATED URL
      const consultations = await response.json();
      consultationsGrid.innerHTML = '';
      consultations.forEach(consultation => {
        const card = createConsultationCard(consultation);
        consultationsGrid.appendChild(card);
      });
    } catch (error) {
      console.error('Could not load past consultations:', error);
    }
  };

  const openPaymentModal = (consultation) => {
    paymentConsultationIdInput.value = consultation.id;
    paymentOverlay.style.display = 'flex';
  };
  const closePaymentModal = () => {
    paymentOverlay.style.display = 'none';
    paymentForm.reset();
  };
  
  consultationsGrid.addEventListener('click', (event) => {
    if (event.target.classList.contains('payment-btn')) {
      const card = event.target.closest('.consultation-card');
      const consultationId = card.dataset.id;
      openPaymentModal({ id: consultationId });
    }
  });

  paymentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = paymentConsultationIdInput.value;
    const deliveryData = {
      hostelType: document.getElementById('hostel-type').value,
      hostelBlock: document.getElementById('hostel-block').value,
      roomNumber: document.getElementById('room-number').value,
    };
    
    try {
      const response = await fetch(`/api/confirm-payment/${id}`, { // UPDATED URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryData),
      });

      if (response.ok) {
        closePaymentModal();
        loadPastConsultations(); 
      } else {
        alert('Payment confirmation failed. Please try again.');
      }
    } catch (error) {
      console.error('Payment Error:', error);
    }
  });

  paymentCancelBtn.addEventListener('click', closePaymentModal);

  const addMessageToChat = (message, sender) => {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', `${sender}-message`);
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
  };

  const getAiResponse = async () => {
    const typingElement = document.createElement('div');
    typingElement.classList.add('chat-message', 'ai-message');
    typingElement.id = 'typing-indicator';
    typingElement.innerHTML = '<span>.</span><span>.</span><span>.</span>';
    chatMessages.appendChild(typingElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const response = await fetch('/api/chat', { // UPDATED: Calls your secure backend
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ conversationHistory })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      conversationHistory.push({ role: 'assistant', content: aiMessage });
      addMessageToChat(aiMessage, 'ai');

    } catch (error) {
      console.error('AI Chat Error:', error);
      addMessageToChat('Sorry, I am having trouble connecting. Please try again later.', 'ai');
    }
  };

  const startAiChat = (symptoms) => {
    chatMessages.innerHTML = '';
    
    const initialPrompt = `You are a helpful university medical AI assistant. A human doctor has just been notified of the student's issue. Your goal is to provide immediate, general advice. ALWAYS start your first message by saying "Your consultation has been sent to a doctor." Then, provide helpful advice. IMPORTANT: Always end your messages by reminding the user that this is not an official diagnosis and they should wait for the doctor's response for prescribed medication. The student's symptoms are: "${symptoms}"`;
    
    conversationHistory = [{ role: 'system', content: initialPrompt }];

    addMessageToChat(symptoms, 'user');
    conversationHistory.push({ role: 'user', content: symptoms });

    chatWidget.classList.remove('hidden');
    getAiResponse();
  };

  const handleSendMessage = () => {
    const userMessage = chatInput.value.trim();
    if (userMessage) {
      addMessageToChat(userMessage, 'user');
      conversationHistory.push({ role: 'user', content: userMessage });
      chatInput.value = '';
      getAiResponse();
    }
  };
  
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault(); 
    handleSendMessage();
  });

  chatCloseBtn.addEventListener('click', () => {
    chatWidget.classList.add('hidden');
  });

  studentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(studentForm);
    const dataObject = Object.fromEntries(formData.entries());
    messageDiv.textContent = 'Submitting your request...';

    try {
      const response = await fetch('/api/submit-consultation', { // UPDATED URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataObject),
      });

      if (response.ok) {
        messageDiv.textContent = 'Your request has been sent successfully!';
        messageDiv.style.color = 'green';
        loadPastConsultations();
        studentForm.reset();
        
        startAiChat(dataObject.symptomsInput);

      } else {
        messageDiv.textContent = 'An error occurred.';
        messageDiv.style.color = 'red';
      }
    } catch (error) {
      console.error('Submission Error:', error);
      messageDiv.textContent = 'Could not connect to the server.';
      messageDiv.style.color = 'red';
    }
  });

  loadPastConsultations();
});