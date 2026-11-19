import pg from 'pg';
import type {State} from '../shared/game.js';
const pool=process.env.DATABASE_URL?new pg.Pool({connectionString:process.env.DATABASE_URL}):null;
export async function initialize(){if(pool)await pool.query('CREATE TABLE IF NOT EXISTS rage_matches (id bigserial PRIMARY KEY, finished_at timestamptz DEFAULT now(), results jsonb NOT NULL)')}
export async function save(s:State){if(pool)await pool.query('INSERT INTO rage_matches(results) VALUES($1)',[JSON.stringify(s.players.map(p=>({name:p.name,score:p.score,kills:p.kills,loot:p.loot})))])}
export async function leaders(){return pool?(await pool.query("SELECT results, finished_at FROM rage_matches ORDER BY finished_at DESC LIMIT 20")).rows:[]}
