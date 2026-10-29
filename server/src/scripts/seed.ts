/**
 * Loads the curriculum from /content into MongoDB. Safe to re-run: documents are upserted by
 * (track, slug) and anything no longer present in the files is removed.
 *   npm run seed
 */
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { config } from '../config';
import { Concept, Lesson, Question, Reference, Track } from '../models';
import { encodeIntegralFloats } from '../utils/floats';

function parseFrontMatter(text: string): { meta: Record<string, string | string[] | number>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error('missing front matter');
  const meta: Record<string, string | string[] | number> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let value: string = line.slice(i + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      continue;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    meta[key] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return { meta, body: m[2].trim() };
}

const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(p, 'utf8')) as T;

async function seedTrack(dir: string) {
  const track = readJson<any>(path.join(dir, 'track.json'));
  const concepts = readJson<any[]>(path.join(dir, 'concepts.json'));
  const slug: string = track.slug;

  await Track.updateOne({ slug }, { $set: track }, { upsert: true });

  await Concept.deleteMany({ track: slug });
  await Concept.insertMany(concepts.map((c) => ({ ...c, track: slug })));

  let lessonCount = 0;
  let questionCount = 0;
  const lessonKeys: string[] = [];
  const questionSlugs: string[] = [];

  for (const topic of track.topics) {
    const tdir = path.join(dir, topic.slug);
    const lessonFiles = fs.existsSync(path.join(tdir, 'lessons'))
      ? fs.readdirSync(path.join(tdir, 'lessons')).filter((f) => f.endsWith('.md')).sort()
      : [];
    for (const file of lessonFiles) {
      const m = /^(\d+)-(.+)\.md$/.exec(file);
      if (!m) continue;
      const lessonSlug = m[2];
      if (!topic.lessons.some((l: any) => l.slug === lessonSlug)) {
        console.warn(`  skip ${topic.slug}/${file}: not listed in track.json`);
        continue;
      }
      const { meta, body } = parseFrontMatter(fs.readFileSync(path.join(tdir, 'lessons', file), 'utf8'));
      await Lesson.updateOne(
        { track: slug, topic: topic.slug, slug: lessonSlug },
        {
          $set: {
            order: Number(m[1]),
            title: String(meta.title ?? lessonSlug),
            summary: String(meta.summary ?? ''),
            minutes: Number(meta.minutes ?? 10),
            concepts: Array.isArray(meta.concepts) ? meta.concepts : [],
            body,
          },
        },
        { upsert: true },
      );
      lessonKeys.push(`${topic.slug}/${lessonSlug}`);
      lessonCount++;
    }

    const refFile = path.join(tdir, 'reference.md');
    if (fs.existsSync(refFile)) {
      const { meta, body } = parseFrontMatter(fs.readFileSync(refFile, 'utf8'));
      await Reference.updateOne(
        { track: slug, topic: topic.slug },
        { $set: { title: String(meta.title ?? `${topic.title} reference`), body } },
        { upsert: true },
      );
    }

    const qFile = path.join(tdir, 'questions.json');
    if (fs.existsSync(qFile)) {
      // Integral floats are protected from JS number handling (see utils/floats.ts).
      const questions = JSON.parse(encodeIntegralFloats(fs.readFileSync(qFile, 'utf8'))) as any[];
      let order = 0;
      for (const q of questions) {
        const { tests, ...rest } = q;
        await Question.updateOne(
          { track: slug, slug: q.slug },
          { $set: { ...rest, testsJson: JSON.stringify(tests), track: slug, topic: topic.slug, order: order++ } },
          { upsert: true },
        );
        questionSlugs.push(q.slug);
        questionCount++;
      }
    }
  }

  // Remove content that was deleted from the files.
  const allLessons = await Lesson.find({ track: slug }).select('topic slug').lean();
  for (const l of allLessons) {
    if (!lessonKeys.includes(`${l.topic}/${l.slug}`)) await Lesson.deleteOne({ _id: l._id });
  }
  await Question.deleteMany({ track: slug, slug: { $nin: questionSlugs } });

  console.log(`track "${slug}": ${track.topics.length} topics, ${lessonCount} lessons, ${questionCount} questions, ${concepts.length} concepts`);
}

async function main() {
  const root = path.join(config.contentDir, 'tracks');
  if (!fs.existsSync(root)) throw new Error(`Content directory not found: ${root}`);
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'track.json'))) {
      await seedTrack(path.join(root, entry.name));
    }
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
