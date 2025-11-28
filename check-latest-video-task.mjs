import { drizzle } from 'drizzle-orm/mysql2';
import { desc, gte, sql } from 'drizzle-orm';
import { avatarVideoTasks, podcastHighlights, podcastTasks } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

const results = await db
  .select()
  .from(avatarVideoTasks)
  .leftJoin(podcastHighlights, sql`${avatarVideoTasks.highlightId} = ${podcastHighlights.id}`)
  .leftJoin(podcastTasks, sql`${avatarVideoTasks.taskId} = ${podcastTasks.id}`)
  .where(gte(avatarVideoTasks.createdAt, tenMinutesAgo))
  .orderBy(desc(avatarVideoTasks.createdAt))
  .limit(1);

console.log(JSON.stringify(results, null, 2));
