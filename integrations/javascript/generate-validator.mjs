import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import standaloneCode from 'ajv/dist/standalone/index.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const schema=JSON.parse(await readFile(path.join(here,'character-project-v2.schema.json'),'utf8'));
const ajv=new Ajv({strict:true,code:{source:true,esm:true},allErrors:true});
const validate=ajv.compile(schema);
await writeFile(path.join(here,'project-validator.generated.js'),standaloneCode(ajv,validate),'utf8');
