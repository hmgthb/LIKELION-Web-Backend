import express from 'express';
import projectsRouter from './routes/projects';
import adminsRouter from './routes/admins';
import photosRouter from './routes/photos';
import signup_admin from './routes/signup_admin';
import signup_member from './routes/signup_member';

const app = express();
app.use(express.json());

// All routes share the same base prefix:
app.use('/api', projectsRouter);
app.use('/api', adminsRouter);
app.use('/api', photosRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});

app.use('/api', signup_admin);
app.use('/api', signup_member);

app.listen(3000, () => console.log('✅ Server running on port 3000'));
