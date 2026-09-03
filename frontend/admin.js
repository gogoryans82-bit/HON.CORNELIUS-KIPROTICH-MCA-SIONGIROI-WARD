let token = localStorage.getItem('adminToken');

function adminLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            token = data.token;
            localStorage.setItem('adminToken', token);
            showDashboard();
        } else {
            document.getElementById('loginMsg').textContent = 'Invalid credentials';
        }
    });
}

function logout() {
    localStorage.removeItem('adminToken');
    token = null;
    location.reload();
}

function showDashboard() {
    if (token) {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
    }
}

// Event form submit
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
    });
    alert('Event added!');
    form.reset();
});

// News form submit
document.getElementById('newsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    await fetch('/api/admin/news', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
    });
    alert('News added!');
    form.reset();
});

// On load, check if token exists
if (token) showDashboard();
