import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:5173',
}));
app.use(express.json());


const languageIds: Record<string, number> = {
  javascript: 63,
  python: 71,
  typescript: 74,
  csharp: 51,
};

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

