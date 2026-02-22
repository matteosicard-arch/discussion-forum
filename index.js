const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('@replit/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Replit Database
const db = new Database();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize default data if not exists
async function initializeDB() {
  const existingCategories = await db.get('categories');
  if (!existingCategories) {
    await db.set('categories', [
      { id: 1, name: 'Général', description: 'Discussions générales' },
      { id: 2, name: 'Aide', description: 'Besoin d\'aide ?' },
      { id: 3, name: 'Annonces', description: 'Annonces et news' }
    ]);
  }

  const existingThreads = await db.get('threads');
  if (!existingThreads) {
    await db.set('threads', [
      { id: 1, categoryId: 1, title: 'Bienvenue!', author: 'Admin', content: 'Bienvenue sur le forum de discussion. N\'hésitez pas à créer des sujets!', createdAt: new Date(), replies: 0 }
    ]);
  }

  const existingMessages = await db.get('messages');
  if (!existingMessages) {
    await db.set('messages', [
      { id: 1, threadId: 1, author: 'Admin', content: 'Premier message de bienvenue!', createdAt: new Date() }
    ]);
  }

  const nextThreadId = await db.get('nextThreadId');
  if (!nextThreadId) {
    await db.set('nextThreadId', 2);
  }

  const nextMessageId = await db.get('nextMessageId');
  if (!nextMessageId) {
    await db.set('nextMessageId', 2);
  }
}

// GET all categories
app.get('/api/categories', async (req, res) => {
  const categories = await db.get('categories') || [];
  res.json(categories);
});

// GET all threads
app.get('/api/threads', async (req, res) => {
  const categoryId = req.query.categoryId;
  const threads = await db.get('threads') || [];
  const filtered = categoryId ? threads.filter(t => t.categoryId == categoryId) : threads;
  res.json(filtered);
});

// GET thread messages
app.get('/api/threads/:threadId/messages', async (req, res) => {
  const threadId = req.params.threadId;
  const messages = await db.get('messages') || [];
  const threadMessages = messages.filter(m => m.threadId == threadId);
  res.json(threadMessages);
});

// CREATE new thread
app.post('/api/threads', async (req, res) => {
  const { categoryId, title, content, author } = req.body;
  
  if (!categoryId || !title || !content || !author) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const nextThreadId = await db.get('nextThreadId') || 1;
  const threads = await db.get('threads') || [];
  
  const newThread = {
    id: nextThreadId,
    categoryId: parseInt(categoryId),
    title,
    author,
    content,
    createdAt: new Date(),
    replies: 0
  };

  threads.push(newThread);
  await db.set('threads', threads);
  await db.set('nextThreadId', nextThreadId + 1);
  
  // Add first message
  const nextMessageId = await db.get('nextMessageId') || 1;
  const messages = await db.get('messages') || [];
  
  const firstMessage = {
    id: nextMessageId,
    threadId: newThread.id,
    author,
    content,
    createdAt: new Date()
  };
  messages.push(firstMessage);
  await db.set('messages', messages);
  await db.set('nextMessageId', nextMessageId + 1);

  res.status(201).json(newThread);
});

// ADD reply to thread
app.post('/api/threads/:threadId/messages', async (req, res) => {
  const { author, content } = req.body;
  const threadId = req.params.threadId;

  if (!author || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const threads = await db.get('threads') || [];
  const thread = threads.find(t => t.id == threadId);
  if (thread) {
    thread.replies++;
    await db.set('threads', threads);
  }

  const nextMessageId = await db.get('nextMessageId') || 1;
  const messages = await db.get('messages') || [];

  const newMessage = {
    id: nextMessageId,
    threadId: parseInt(threadId),
    author,
    content,
    createdAt: new Date()
  };

  messages.push(newMessage);
  await db.set('messages', messages);
  await db.set('nextMessageId', nextMessageId + 1);

  res.status(201).json(newMessage);
});

// DELETE message (admin only for now)
app.delete('/api/messages/:messageId', async (req, res) => {
  const messageId = req.params.messageId;
  const messages = await db.get('messages') || [];
  const index = messages.findIndex(m => m.id == messageId);
  
  if (index > -1) {
    const message = messages[index];
    messages.splice(index, 1);
    await db.set('messages', messages);
    
    // Update thread reply count
    const threads = await db.get('threads') || [];
    const thread = threads.find(t => t.id === message.threadId);
    if (thread && thread.replies > 0) {
      thread.replies--;
      await db.set('threads', threads);
    }
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Message not found' });
  }
});

// Start server
app.listen(PORT, async () => {
  await initializeDB();
  console.log(`Forum running on http://localhost:${PORT}`);
});

