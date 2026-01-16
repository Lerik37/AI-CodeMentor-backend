import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRoutes } from './routes';

dotenv.config();

export function createApp(): Express {
    const application = express();

    const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5176';

    application.use(
        cors({
            origin: allowedOrigin,
        }),
    );

    application.use(express.json());
    application.use(createRoutes());

    return application;
}
