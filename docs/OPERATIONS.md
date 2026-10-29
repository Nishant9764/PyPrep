# Security and operations status

## Protections already enforced

- Signup, login, run, and submit endpoints have rate limits; passwords are bcrypt-hashed.
- Role checks protect administration endpoints. Approval, rejection, suspension, and reinstatement actions are recorded in each account's history.
- Session cookies are HTTP-only, SameSite=Lax, and origin-checked on writes. An account can now revoke every signed-in session from the sidebar.
- Learner code runs in the separate runner container. Compose disables its network, makes its filesystem read-only, drops capabilities, bounds processes/CPU/memory, and gives each job CPU/memory/file/process limits plus a wall-clock kill.
- Content is versioned with the repository. `npm run validate:content` checks IDs, exact duplicate titles/prompts, content structure, test metadata, and executes every reference solution against its authored tests.
- `.github/workflows/ci.yml` runs content validation, runner isolation checks, server tests, and the production client build on pushes and pull requests.

## Database backup and recovery check

Create a compressed archive and checksum:

```sh
scripts/backup-mongo.sh /secure/path/pyprep-backups
```

Verify and restore the archive into a new, uniquely named database without replacing the live `pyprep` database:

```sh
scripts/verify-mongo-backup.sh /secure/path/pyprep-backups/pyprep-YYYYMMDDTHHMMSSZ.archive.gz
```

Schedule `backup-mongo.sh` with the host's approved scheduler and retention policy. Store archives off the application host and protect them with the organization's encryption and access-control policy. The recovery script leaves its check database in Mongo for inspection and cleanup.

## Operational gaps that need deployment choices

- Password reset and account recovery need a configured mail provider and verified sender; none is configured in this repository, so no insecure reset endpoint was added.
- The production content mount is read-only and repository files are the curriculum source of truth. Admin content editing/review/retirement should be implemented as a version-controlled authoring workflow before adding in-app writes that could drift from those files.
- The backup and recovery scripts are present, but a schedule, off-site destination, encryption key policy, retention period, and a live recovery drill must be set and run by the deployment owner.
- Account actions have per-user audit history. There is not yet a centralized audit stream for content edits because content changes are reviewed as repository changes.
