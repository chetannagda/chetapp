import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:3001'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 5e6 // 5MB max for socket messages
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${nanoid(8)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// In-memory storage for rooms and messages
const rooms = new Map();
const typingUsers = new Map();

// Input sanitization helper
const sanitizeInput = (input, maxLength = 500) => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, (char) => char === '<' ? '&lt;' : '&gt;');
};

// Validate channel code
const isValidChannelCode = (code) => {
  if (typeof code !== 'string') return false;
  return /^[a-zA-Z0-9]{4,20}$/.test(code);
};

// Validate username
const isValidUsername = (username) => {
  if (typeof username !== 'string') return false;
  const sanitized = username.trim();
  return sanitized.length >= 1 && sanitized.length <= 30;
};

// Generate a random channel code
const generateChannelCode = () => {
  return nanoid(8).toUpperCase();
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload image endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Error handling for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUsername = null;

  // Join room
  socket.on('join-room', ({ channelCode, username }) => {
    // Validate inputs
    if (!isValidChannelCode(channelCode)) {
      socket.emit('error', { message: 'Invalid channel code. Use 4-20 alphanumeric characters.' });
      return;
    }
    
    if (!isValidUsername(username)) {
      socket.emit('error', { message: 'Invalid username. Use 1-30 characters.' });
      return;
    }

    const sanitizedUsername = sanitizeInput(username, 30);
    const normalizedCode = channelCode.toUpperCase();
    
    // Leave previous room if any
    if (currentRoom) {
      socket.leave(currentRoom);
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        io.to(currentRoom).emit('user-left', { 
          username: currentUsername,
          users: Array.from(room.users.values())
        });
      }
    }

    // Join new room
    socket.join(normalizedCode);
    currentRoom = normalizedCode;
    currentUsername = sanitizedUsername;

    // Initialize room if it doesn't exist
    if (!rooms.has(normalizedCode)) {
      rooms.set(normalizedCode, {
        messages: [],
        users: new Map()
      });
    }

    const room = rooms.get(normalizedCode);
    room.users.set(socket.id, { username: sanitizedUsername, id: socket.id });

    // Send existing messages to the new user
    socket.emit('room-joined', {
      channelCode: normalizedCode,
      messages: room.messages,
      users: Array.from(room.users.values())
    });

    // Notify others about new user
    socket.to(normalizedCode).emit('user-joined', {
      username: sanitizedUsername,
      users: Array.from(room.users.values())
    });

    console.log(`${sanitizedUsername} joined room: ${normalizedCode}`);
  });

  // Send message
  socket.on('send-message', ({ content, replyTo }) => {
    if (!currentRoom || !currentUsername) {
      socket.emit('error', { message: 'You must join a room first.' });
      return;
    }

    const sanitizedContent = sanitizeInput(content, 2000);
    if (!sanitizedContent) {
      return;
    }

    const room = rooms.get(currentRoom);
    if (!room) return;

    const message = {
      id: nanoid(),
      sender: currentUsername,
      senderId: socket.id,
      content: sanitizedContent,
      timestamp: new Date().toISOString(),
      type: 'text',
      replyTo: replyTo ? {
        id: replyTo.id,
        sender: replyTo.sender,
        content: replyTo.content?.slice(0, 100),
        type: replyTo.type
      } : null
    };

    room.messages.push(message);
    
    // Limit messages per room to prevent memory issues
    if (room.messages.length > 500) {
      room.messages = room.messages.slice(-500);
    }

    io.to(currentRoom).emit('new-message', message);
  });

  // Send image message
  socket.on('send-image', ({ imageUrl, filename, replyTo }) => {
    if (!currentRoom || !currentUsername) {
      socket.emit('error', { message: 'You must join a room first.' });
      return;
    }

    const room = rooms.get(currentRoom);
    if (!room) return;

    const message = {
      id: nanoid(),
      sender: currentUsername,
      senderId: socket.id,
      content: imageUrl,
      filename: filename,
      timestamp: new Date().toISOString(),
      type: 'image',
      replyTo: replyTo ? {
        id: replyTo.id,
        sender: replyTo.sender,
        content: replyTo.content?.slice(0, 100),
        type: replyTo.type
      } : null
    };

    room.messages.push(message);
    
    if (room.messages.length > 500) {
      room.messages = room.messages.slice(-500);
    }

    io.to(currentRoom).emit('new-message', message);
  });

  // Typing indicator
  socket.on('typing-start', () => {
    if (!currentRoom || !currentUsername) return;
    
    if (!typingUsers.has(currentRoom)) {
      typingUsers.set(currentRoom, new Set());
    }
    typingUsers.get(currentRoom).add(currentUsername);
    
    socket.to(currentRoom).emit('typing-update', {
      users: Array.from(typingUsers.get(currentRoom))
    });
  });

  socket.on('typing-stop', () => {
    if (!currentRoom || !currentUsername) return;
    
    const roomTyping = typingUsers.get(currentRoom);
    if (roomTyping) {
      roomTyping.delete(currentUsername);
      socket.to(currentRoom).emit('typing-update', {
        users: Array.from(roomTyping)
      });
    }
  });

  // Generate new channel code
  socket.on('generate-code', () => {
    const code = generateChannelCode();
    socket.emit('code-generated', { code });
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.users.delete(socket.id);
        
        // Clean up typing indicator
        const roomTyping = typingUsers.get(currentRoom);
        if (roomTyping && currentUsername) {
          roomTyping.delete(currentUsername);
        }
        
        io.to(currentRoom).emit('user-left', {
          username: currentUsername,
          users: Array.from(room.users.values())
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(currentRoom);
          typingUsers.delete(currentRoom);
          console.log(`Room ${currentRoom} deleted (empty)`);
        }
      }
    }
  });
});

// Periodic cleanup of old uploads (every hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  fs.readdir(uploadsDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (stats.mtimeMs < oneHourAgo) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`ChetApp server running on port ${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
