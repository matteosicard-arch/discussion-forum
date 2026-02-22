// API Base URL (will work on both local and Replit)
const API_URL = window.location.origin;

let currentUser = localStorage.getItem('username') || 'Anonyme';
let currentCategory = null;
let currentThread = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    updateUserDisplay();
    loadThreads();
});

// User Management
function setUsername() {
    const input = document.getElementById('username');
    const username = input.value.trim();
    
    if (username.length === 0) {
        alert('Veuillez entrer un pseudo');
        return;
    }
    
    if (username.length > 20) {
        alert('Pseudo trop long (max 20 caractères)');
        return;
    }
    
    currentUser = username;
    localStorage.setItem('username', username);
    updateUserDisplay();
    input.value = '';
}

function updateUserDisplay() {
    document.getElementById('currentUser').innerText = `👤 ${currentUser}`;
    document.getElementById('username').value = '';
}

// Load Categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/api/categories`);
        const categories = await response.json();
        
        const categoriesList = document.getElementById('categories');
        categoriesList.innerHTML = '';
        
        categories.forEach(category => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.innerText = `${category.name} (${category.description.substring(0, 15)}...)`;
            btn.onclick = () => selectCategory(category.id, category.name);
            categoriesList.appendChild(btn);
        });
        
        // Populate select for new thread form
        const select = document.getElementById('categorySelect');
        select.innerHTML = '<option value="">Sélectionne une catégorie</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.innerText = category.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
    }
}

// Select Category
function selectCategory(categoryId, categoryName) {
    currentCategory = categoryId;
    document.getElementById('categoryTitle').innerText = categoryName;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadThreads();
}

// Load Threads
async function loadThreads() {
    try {
        const url = currentCategory 
            ? `${API_URL}/api/threads?categoryId=${currentCategory}`
            : `${API_URL}/api/threads`;
        
        const response = await fetch(url);
        const threads = await response.json();
        
        const threadsList = document.getElementById('threadsList');
        threadsList.innerHTML = '';
        
        if (threads.length === 0) {
            threadsList.innerHTML = '<p style="text-align: center; color: #999;">Aucun sujet pour le moment. Sois le premier à en créer!</p>';
            return;
        }
        
        threads.forEach(thread => {
            const card = document.createElement('div');
            card.className = 'thread-card';
            card.onclick = () => openThread(thread.id, thread.title);
            
            const date = new Date(thread.createdAt).toLocaleDateString('fr-FR');
            
            card.innerHTML = `
                <h3>${escapeHtml(thread.title)}</h3>
                <div class="thread-meta">
                    <span>👤 ${escapeHtml(thread.author)}</span>
                    <span>📅 ${date}</span>
                    <span>💬 ${thread.replies} réponse(s)</span>
                </div>
                <div class="thread-preview">${escapeHtml(thread.content.substring(0, 100))}...</div>
            `;
            threadsList.appendChild(card);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des sujets:', error);
    }
}

// Open Thread
async function openThread(threadId, threadTitle) {
    currentThread = threadId;
    document.getElementById('threadTitle').innerText = threadTitle;
    
    try {
        const response = await fetch(`${API_URL}/api/threads/${threadId}/messages`);
        const messages = await response.json();
        
        const messagesList = document.getElementById('messagesList');
        messagesList.innerHTML = '';
        
        messages.forEach(message => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message';
            
            const date = new Date(message.createdAt).toLocaleString('fr-FR');
            
            msgDiv.innerHTML = `
                <div class="message-author">👤 ${escapeHtml(message.author)}</div>
                <div class="message-time">${date}</div>
                <div class="message-content">${escapeHtml(message.content).replace(/\n/g, '<br>')}</div>
            `;
            messagesList.appendChild(msgDiv);
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
    }
    
    switchView('threadView');
}

// Add Message to Thread
async function addMessage() {
    if (!currentUser || currentUser === 'Anonyme') {
        alert('Veuillez définir un pseudo');
        return;
    }
    
    const textarea = document.getElementById('messageContent');
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Veuillez écrire un message');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/threads/${currentThread}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author: currentUser,
                content: content
            })
        });
        
        if (response.ok) {
            textarea.value = '';
            await openThread(currentThread, document.getElementById('threadTitle').innerText);
        } else {
            alert('Erreur lors de l\'ajout du message');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ajout du message');
    }
}

// Show New Thread Form
function showNewThreadForm() {
    switchView('newThreadView');
}

// Create New Thread
async function createThread(event) {
    event.preventDefault();
    
    if (!currentUser || currentUser === 'Anonyme') {
        alert('Veuillez définir un pseudo');
        return;
    }
    
    const categoryId = document.getElementById('categorySelect').value;
    const title = document.getElementById('threadTitle').value.trim();
    const content = document.getElementById('threadContent').value.trim();
    
    if (!categoryId || !title || !content) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/threads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                categoryId: parseInt(categoryId),
                title: title,
                content: content,
                author: currentUser
            })
        });
        
        if (response.ok) {
            document.getElementById('threadForm').reset();
            alert('Sujet créé avec succès!');
            backToCategories();
            loadThreads();
        } else {
            alert('Erreur lors de la création du sujet');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création du sujet');
    }
}

// Navigation
function backToCategories() {
    currentThread = null;
    switchView('threadsView');
    loadThreads();
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(viewName).classList.add('active');
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
