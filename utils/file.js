import fs from 'fs';
import log from './logger.js';

export function readFile(pathFile) {
    try {
        const datas = fs.readFileSync(pathFile, 'utf8')
            .split('\n')
            .map(data => data.trim())
            .filter(data => data.length > 0);
        return datas;
    } catch (error) {
        log.error(`Error reading file: ${error.message}`);
        return [];
    }
}