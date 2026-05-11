import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../config/swagger';

const outDir = path.join(__dirname, '../../openapi');
const outFile = path.join(outDir, 'openapi.json');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(swaggerSpec, null, 2), 'utf-8');
console.log(`OpenAPI escrito en: ${outFile}`);
