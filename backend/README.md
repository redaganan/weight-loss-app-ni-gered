# Weight-loss backend

## Normalized activity data

## Exercise catalog

The workout library is seeded from the public-domain
[Free Exercise DB](https://github.com/yuhonas/free-exercise-db) dataset in
`data/free-exercise-db.json`. It provides exercise names, muscle targets,
equipment, instructions, and image references without requiring an API key.
The source dataset is public domain; keep its attribution/source link when
redistributing the catalog.

New meal and workout activity is stored in:

- `meallogs`
- `workoutlogs`

Plans use the normalized `fitnessplans`, `plandays`, `planexercises`, and
`planmeals` collections. `userprofiles` retains embedded plan fields for
frontend compatibility while existing clients migrate to the normalized plan
response.

`recommendationhistories` is retained only for non-workout history such as
weight logs and plan-generation records. Workout-history duplicates are no
longer written.

## Validation

Run the normalized backend integration test from this directory:

```bash
npm run test:normalized
```

The combined backend regression command is:

```bash
npm run test:all
```

## Legacy cleanup

The cleanup script is dry-run by default:

```bash
npm run cleanup:legacy
```

To delete deprecated legacy `meals` records and
`recommendationhistories` records with `type: 'workout_log'` in the configured
development database:

```bash
node scripts/cleanup-legacy-activity.js --execute
```

The script does not modify normalized collections or other recommendation
types.
