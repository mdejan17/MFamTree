const express = require('express');
const app = express();
const port = 5858; // You can change this port if needed

// Middleware to parse JSON bodies (if you need to handle JSON requests)
app.use(express.json());

// A simple GET endpoint
app.get('/', (req, res) => {
  res.send('Hello, World! Your server is running.');
});

// Another example endpoint
app.get('/api/greet', (req, res) => {
  res.json({ message: 'Hello from the /api/greet endpoint!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});