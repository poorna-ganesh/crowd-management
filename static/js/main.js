const apiBase = '';

// ------------------ Wait Times ------------------
async function refreshWaitTimes() {
  try {
    const res = await fetch('/api/wait-times');
    const data = await res.json();
    const ul = document.getElementById('waitTimes');
    if (!ul) return;
    ul.innerHTML = '';
    Object.keys(data).forEach(k => {
      const li = document.createElement('li');
      li.textContent = `${k}: ${data[k]} minutes`;
      ul.appendChild(li);
    });
  } catch (err) {
    console.error('Error fetching wait times:', err);
  }
}

// ------------------ Parking ------------------
async function refreshParking() {
  try {
    const res = await fetch('/api/parking');
    const data = await res.json();
    const list = document.getElementById('parkingList');
    if (!list) return;
    list.innerHTML = '';
    data.forEach(s => {
      const li = document.createElement('li');
      li.textContent = `${s.slot_id} — ${s.status} (Level ${s.level})`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error('Error fetching parking:', err);
  }
}

// ------------------ Booking ------------------
const bookForm = document.getElementById('bookForm');
if (bookForm) {
  bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(bookForm);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const out = document.getElementById('bookingResult');
      if (!out) return;

      if (data.status === 'ok') {
        out.innerHTML = `
          <div style="padding:10px; background:#d4edda; border:1px solid #c3e6cb; border-radius:5px;">
            <strong>Booking Confirmed!</strong><br>
            ID: ${data.booking_id}<br>
            Slot: ${payload.slot_time} (${payload.queue_type})<br>
            <a href="${data.qr_url}" target="_blank">Download QR Pass</a>
          </div>
        `;
        out.scrollIntoView({ behavior: 'smooth' });
      } else {
        out.textContent = 'Booking failed';
      }
    } catch (err) {
      console.error('Booking error:', err);
    }
  });
}

// ------------------ SOS ------------------
const sosBtn = document.getElementById('sosBtn');
if (sosBtn) {
  sosBtn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Anonymous', lat, lng })
        });
        const data = await res.json();
        const out = document.getElementById('sosResult');
        if (out) out.textContent = data.status;
      } catch (err) {
        console.error('SOS error:', err);
      }
    }, () => alert('Could not get location'));
  });
}

// ------------------ Accessibility ------------------
const accBtn = document.getElementById('accessibilityToggle');
if (accBtn) {
  accBtn.addEventListener('click', () => {
    document.body.classList.toggle('accessible');
  });
}

// ------------------ Voice Commands ------------------
const voiceBtn = document.getElementById('voiceStart');
if (voiceBtn && window.SpeechRecognition) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRecognition();
  rec.lang = 'en-IN';
  rec.continuous = false;

  voiceBtn.addEventListener('click', () => {
    rec.start();
    const out = document.getElementById('voiceResult');
    if (out) out.textContent = 'Listening...';
  });

  rec.onresult = (e) => {
    const t = e.results[0][0].transcript.toLowerCase();
    const out = document.getElementById('voiceResult');
    if (out) out.textContent = `Heard: ${t}`;

    if (t.includes('book slot')) {
      const nameInput = document.querySelector('#bookForm input[name="name"]');
      if (nameInput) nameInput.focus();
    }
  };
}

// ------------------ Map ------------------
function initMap() {
  const somnath = { lat: 20.9097, lng: 70.3995 };
  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  const map = new google.maps.Map(mapEl, {
    center: somnath,
    zoom: 17
  });

  const markers = [
    { pos: somnath, title: 'Somnath Temple (Main Gate)', info: 'Main Gate' },
    { pos: { lat: 20.9092, lng: 70.4002 }, title: 'Entrance 2', info: 'Secondary entrance' },
    { pos: { lat: 20.9084, lng: 70.3989 }, title: 'Parking', info: 'Parking & stalls' }
  ];

  markers.forEach(m => {
    const mk = new google.maps.Marker({ position: m.pos, map, title: m.title });
    const infow = new google.maps.InfoWindow({
      content: `<div>
                  <b>${m.title}</b>
                  <p>${m.info}</p>
                  <button onclick="speakDirections('${m.title}')">Navigate (audio)</button>
                </div>`
    });
    mk.addListener('click', () => infow.open(map, mk));
  });
}

function speakDirections(place) {
  const msg = `Turn right and walk 200 meters to ${place}. Follow signs and use the accessible route if needed.`;
  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  } else {
    alert(msg);
  }
}

// ------------------ Initialize ------------------
window.addEventListener('load', () => {
  refreshWaitTimes();
  refreshParking();

  // Periodic refresh
  setInterval(refreshWaitTimes, 30_000);
  setInterval(refreshParking, 60_000);
});
