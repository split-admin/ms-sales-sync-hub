import app from './server-crm-endpoints.js';
import serverless from 'serverless-http';
export default serverless(app);
