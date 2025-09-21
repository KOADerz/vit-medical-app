document.addEventListener('DOMContentLoaded', () => {
  const requestsList = document.getElementById('requests-list');
  const responsesList = document.getElementById('responses-list');
  const responseFormContainer = document.getElementById('response-form-container');
  const responseForm = document.getElementById('response-form');
  const selectIssuePlaceholder = document.getElementById('select-issue-placeholder');
  const cancelBtn = document.getElementById('cancel-btn');

  const consultationIdInput = document.getElementById('consultation-id-input');
  const modalStudentInfo = document.getElementById('modal-student-info');
  const diagnosisInput = document.getElementById('diagnosis-input');
  const medicineInput = document.getElementById('medicine-input');
  const priceInput = document.getElementById('price-input');

  const pendingCountSpan = document.getElementById('pending-count');
  const responseCountSpan = document.getElementById('response-count');

  let activeRequestCard = null;

  const loadConsultations = async () => {
    try {
      const response = await fetch('/api/get-consultations'); // UPDATED URL
      const consultations = await response.json();

      requestsList.innerHTML = '';
      responsesList.innerHTML = '';
      
      let pendingCount = 0;
      let completedCount = 0;

      consultations.forEach(c => {
        if (c.status === 'pending') {
          const card = createRequestCard(c);
          requestsList.appendChild(card);
          pendingCount++;
        } else {
          const card = createResponseCard(c);
          responsesList.appendChild(card);
          completedCount++;
        }
      });

      pendingCountSpan.textContent = pendingCount;
      responseCountSpan.textContent = completedCount;

      if (pendingCount === 0) {
        requestsList.innerHTML = `<div class="empty-state"><span class="icon">⏰</span><p>No pending issues</p></div>`;
      }
      if (completedCount === 0) {
        responsesList.innerHTML = `<div class="empty-state"><span class="icon">💊</span><p>No responses yet</p></div>`;
      }

      if (activeRequestCard && !consultations.find(c => c.id === parseInt(activeRequestCard.dataset.id) && c.status === 'pending')) {
        hideResponseForm();
      }

    } catch (error) {
      console.error('Failed to load consultations:', error);
    }
  };

  const createRequestCard = (consultation) => {
    const card = document.createElement('div');
    card.className = 'card request-card';
    card.dataset.id = consultation.id;
    const receivedTime = new Date(consultation.receivedAt).toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    card.innerHTML = `<h4><span class="icon">🧑‍⚕️</span> ${consultation.studentName}</h4><p class="symptoms">${consultation.symptoms}</p><p class="meta">${receivedTime}</p>`;
    card.addEventListener('click', () => openResponseForm(consultation, card));
    return card;
  };

  const createResponseCard = (consultation) => {
    const card = document.createElement('div');
    card.className = 'card response-card';
    const respondedTime = new Date(consultation.response.respondedAt).toLocaleString('en-IN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    card.innerHTML = `<h4><span class="icon">🧑‍⚕️</span> ${consultation.studentName}</h4><p class="symptoms">${consultation.symptoms}</p><div class="response-details"><p><strong>Diagnosis:</strong> ${consultation.response.diagnosis}</p><p><strong>Medicine:</strong> ${consultation.response.medicine}</p><p><strong>Fee:</strong> ₹${consultation.response.price}</p></div><p class="meta">Responded: ${respondedTime}</p>`;
    return card;
  };

  const openResponseForm = (consultation, cardElement) => {
    if (activeRequestCard) {
      activeRequestCard.classList.remove('active');
    }
    cardElement.classList.add('active');
    activeRequestCard = cardElement;
    selectIssuePlaceholder.style.display = 'none';
    responseForm.style.display = 'flex';
    consultationIdInput.value = consultation.id;
    modalStudentInfo.innerHTML = `<p><strong>Student:</strong> ${consultation.studentName} (ID: ${consultation.studentId})</p><p><strong>Symptoms:</strong> ${consultation.symptoms}</p>`;
    diagnosisInput.value = '';
    medicineInput.value = '';
    priceInput.value = '';
  };

  const hideResponseForm = () => {
    responseForm.style.display = 'none';
    selectIssuePlaceholder.style.display = 'flex';
    if (activeRequestCard) {
      activeRequestCard.classList.remove('active');
      activeRequestCard = null;
    }
  };

  responseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = consultationIdInput.value;
    const responseData = {
      diagnosis: diagnosisInput.value,
      medicine: medicineInput.value,
      price: priceInput.value,
    };
    try {
      const response = await fetch(`/api/respond/${id}`, { // UPDATED URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseData),
      });
      if (response.ok) {
        hideResponseForm();
        loadConsultations();
      } else {
        alert('Failed to submit response.');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    }
  });

  cancelBtn.addEventListener('click', hideResponseForm);
  loadConsultations();
});