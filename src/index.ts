import express from 'express';
import projectsRouter from './routes/projects';
import adminsRouter from './routes/admins';
import photosRouter from './routes/photos';
import signupMemberRouter from './routes/signup_member';
import signupAdminRouter from './routes/signup_admin';
import loginRouter from './routes/login';
import attendanceRouter from './routes/attendance';
import cors from 'cors';
import path from 'path';
import qrCreate from './routes/qr-create';

const app = express();
app.use(express.static(path.join(__dirname, '../views')));

// All routes share the same base prefix:
app.use('/api', projectsRouter);
app.use('/api', adminsRouter);
app.use('/api', photosRouter);
app.use('/api', qrCreate);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
app.use(
  cors({
    origin: 'http://localhost:3001', // 프론트엔드 주소
  })
);

app.use('/api', signupMemberRouter);
app.use('/api', signupAdminRouter);
app.use('/api', loginRouter);
app.use('/api', attendanceRouter);

app.listen(3000, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
