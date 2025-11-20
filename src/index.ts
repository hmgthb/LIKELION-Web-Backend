import express from 'express';
import projectsRouter from './routes/projects';
import adminsRouter from './routes/admins';
import photosRouter from './routes/photos';
import signupMemberRouter from './routes/signup';
import loginRouter from './routes/login';
import attendanceRouter from './routes/attendance';
import cors from 'cors';
import path from 'path';
import qrCreate from './routes/qr-create';
import adminManageMembersRouter from './routes/adminpage-manage_members';
import adminBulkSave from './routes/adminpage-save_manage_members';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: 'http://localhost:3001',
  })
);

app.use(express.static(path.join(__dirname, '../views')));

// All routes share the same base prefix:
app.use('/api', projectsRouter);
app.use('/api', adminsRouter);
app.use('/api', photosRouter);
app.use('/api', qrCreate);
app.use('/api', signupMemberRouter);
app.use('/api', loginRouter);
app.use('/api', attendanceRouter);
app.use('/api', adminManageMembersRouter);
app.use('/api', adminBulkSave);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
