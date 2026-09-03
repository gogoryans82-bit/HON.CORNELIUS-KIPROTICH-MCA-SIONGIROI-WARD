// Load events
async function loadEvents() {
    const res = await fetch('/api/events');
    const data = await res.json();
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '';
    data.events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <h3>${event.title}</h3>
            <p>📅 ${event.date} | 📍 ${event.location}</p>
            <button onclick="rsvp(${event.id})">RSVP</button>
        `;
        eventsList.appendChild(card);
    });
}

// Load news
async function loadNews() {
    const res = await fetch('/api/news');
    const data = await res.json();
    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '';
    data.news.forEach(item => {
        const card = document.createElement('div');
        card.className = 'news-card';
        card.innerHTML = `
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ''}
            <h3>${item.title}</h3>
            <p>${item.caption}</p>
        `;
        newsList.appendChild(card);
    });
}

async function rsvp(eventId) {
    const name = prompt('Your name:');
    const phone = prompt('Your phone (e.g., 712345678):');
    if (!name || !phone) return;
    await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name, phone })
    });
    alert('RSVP confirmed!');
}

// Volunteer form submit
document.getElementById('volunteerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    document.getElementById('volunteerMsg').textContent = result.ok ? 'Thank you for volunteering!' : 'Error: ' + result.message;
    form.reset();
});

// Donation form submit
document.getElementById('donateForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.ok) {
        document.getElementById('donateMsg').textContent = 'Thank you for your donation!';
        updateProgress(result.totalRaised, result.goal);
    } else {
        document.getElementById('donateMsg').textContent = 'Error: ' + result.message;
    }
    form.reset();
});

// Load fundraising
async function loadFundraising() {
    const res = await fetch('/api/fundraising');
    const data = await res.json();
    updateProgress(data.totalRaised, data.goal);
}

function updateProgress(raised, goal) {
    const percentage = Math.min(100, Math.round((raised / goal) * 100));
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('raised').textContent = `KSH ${raised.toLocaleString()}`;
}

// Share functions
function shareOnWhatsApp() {
    const text = `I support Cornelius Rotich for MCA Siorngiroi Ward! Join us.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareOnFacebook() {
    const url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.href);
    window.open(url, '_blank');
}

function shareOnTwitter() {
    const text = `I support Cornelius Rotich for MCA Siorngiroi Ward!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
}

// Menu toggle
function toggleMenu() {
    document.querySelector('.main-nav').classList.toggle('open');
}

// Initial load
loadEvents();
loadNews();
loadFundraising();
