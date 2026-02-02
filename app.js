import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

import routes from './src/routes/index.js';
import { errorHandler } from './src/utils/response.handler.js';
import { swaggerSpec } from './src/config/swagger.config.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors('*'));
app.use(morgan('dev'));

// Now JSON parser AFTER webhooks
app.use(bodyParser.json());

// Static demo UI
app.use('/demo-ui', express.static(path.join(__dirname, 'public')));


// ---------------------------
// SWAGGER DOCUMENTATION
// ---------------------------
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Market Guardian AI - API Docs',
}));

// ---------------------------
// ROUTES
// ---------------------------

app.get('/', (req, res) => {
    res.send('Hello World!!');
});

app.use('/api', routes);

app.use((req, res) => {
    res.status(404).send('The requested endpoint does not exist on the server.');
});


// GLOBAL ERROR HANDLER
app.use(errorHandler);

export default app;
