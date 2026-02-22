const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory database (will be cleared on restart)
let categories = [
  { id: 1, name: 'Général', description: 'Discussions générales' },
  { id: 2, name: 'Aide', description: 'Besoin d\'aide ?' },
  { id: 3, name: 'Annonces', description: 'Annonces et news' }
];

let threads = [
  { id: 1, categoryId: 1, title: 'Bienvenue!', author: 'Admin', content: 'Bienvenue sur le forum de discussion. N\'hésitez pas à créer des sujets!', createdAt: new Date(), replies: 0 }
];

let messages = [
  { id: 1, threadId: 1, author: 'Admin', content: 'Premier message de bienvenue!', createdAt: new Date() }
];

let nextThreadId = 2;
let nextMessageId = 2;

// GET all categories
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

// GET all threads
app.get('/api/threads', (req, res) => {
  const categoryId = req.query.categoryId;
  const filtered = categoryId ? threads.filter(t => t.categoryId == categoryId) : threads;
  res.json(filtered);
});

// GET thread messages
app.get('/api/threads/:threadId/messages', (req, res) => {
  const threadId = req.params.threadId;
  const threadMessages = messages.filter(m => m.threadId == threadId);
  res.json(threadMessages);
});

// CREATE new thread
app.post('/api/threads', (req, res) => {
  const { categoryId, title, content, author } = req.body;
  
  if (!categoryId || !title || !content || !author) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newThread = {
    id: nextThreadId++,
    categoryId: parseInt(categoryId),
    title,
    author,
    content,
    createdAt: new Date(),
    replies: 0
  };

  threads.push(newThread);
  
  // Add first message
  const firstMessage = {
    id: nextMessageId++,
    threadId: newThread.id,
    author,
    content,
    createdAt: new Date()
  };
  messages.push(firstMessage);

  res.status(201).json(newThread);
});

// ADD reply to thread
app.post('/api/threads/:threadId/messages', (req, res) => {
  const { author, content } = req.body;
  const threadId = req.params.threadId;

  if (!author || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Update thread reply count
  const thread = threads.find(t => t.id == threadId);
  if (thread) {
    thread.replies++;
  }

  const newMessage = {
    id: nextMessageId++,
    threadId: parseInt(threadId),
    author,
    content,
    createdAt: new Date()
  };

  messages.push(newMessage);
  res.status(201).json(newMessage);
});

// DELETE message (admin only for now)
app.delete('/api/messages/:messageId', (req, res) => {
  const messageId = req.params.messageId;
  const index = messages.findIndex(m => m.id == messageId);
  
  if (index > -1) {
    const message = messages[index];
    messages.splice(index, 1);
    
    // Update thread reply count
    const thread = threads.find(t => t.id === message.threadId);
    if (thread && thread.replies > 0) {
      thread.replies--;
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Message not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Forum running on http://localhost:${PORT}`);
});
