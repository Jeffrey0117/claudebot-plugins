import { execSync } from 'node:child_process'
import { basename, dirname } from 'node:path'
import { scanProjects } from '../../config/projects.js'

export interface CommitInfo {
  readonly hash: string
  readonly date: string       // ISO timestamp
  readonly timestamp: number
  readonly message: string
  readonly insertions: number
  readonly deletions: number
  readonly project: string
}

export interface GitSummary {
  readonly totalCommits: number
  readonly totalInsertions: number
  readonly totalDeletions: number
  readonly projects: readonly { name: string; commits: number; insertions: number; deletions: number }[]
  readonly hourDistribution: readonly number[]  // 24 slots
  readonly dailyCommits: readonly { date: string; count: number }[]
  readonly commits: readonly CommitInfo[]
}

function runGit(cwd: string, args: string): string {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

/**
 * Scan git logs across all projects for a given time range.
 */
export function scanGitActivity(sinceDate: string, untilDate?: string): GitSummary {
  const projects = scanProjects()
  const allCommits: CommitInfo[] = []
  const seenHashes = new Set<string>()

  // Detect worktrees sharing the same git repo.
  // git rev-parse --git-common-dir returns the main .git dir for worktrees.
  // Map each common-dir to the canonical project name (main repo basename).
  const repoNameCache = new Map<string, string>()

  function resolveProjectName(project: { name: string; path: string }): string {
    const commonDir = runGit(project.path, 'rev-parse --git-common-dir')
    if (!commonDir) return project.name

    // Normalize path for consistent cache key
    const normalized = commonDir.replace(/\\/g, '/').replace(/\/+$/, '')

    const cached = repoNameCache.get(normalized)
    if (cached) return cached

    // For worktrees: commonDir = "C:/code/ClaudeBot/.git"
    // For main repo: commonDir = ".git"
    let repoName: string
    if (normalized === '.git') {
      repoName = project.name
    } else {
      // Extract parent dir name: "C:/code/ClaudeBot/.git" → "ClaudeBot"
      repoName = basename(dirname(normalized))
    }

    repoNameCache.set(normalized, repoName)
    return repoName
  }

  const untilArg = untilDate ? ` --until="${untilDate}"` : ''

  // Track which git repos we've already scanned (by common-dir)
  const scannedRepos = new Set<string>()

  for (const project of projects) {
    // Skip if we already scanned this git repo via another worktree
    const commonDir = runGit(project.path, 'rev-parse --git-common-dir')
    const repoKey = commonDir
      ? (commonDir === '.git' ? project.path : commonDir).replace(/\\/g, '/').replace(/\/+$/, '')
      : project.path
    if (scannedRepos.has(repoKey)) continue
    scannedRepos.add(repoKey)

    const projectName = resolveProjectName(project)

    // Get commit log with stats
    const log = runGit(
      project.path,
      `log --all --since="${sinceDate}" ${untilArg} --pretty=format:"%H|%aI|%s" --shortstat`
    )

    if (!log) continue

    const lines = log.split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trim()
      if (!line || !line.includes('|')) {
        i++
        continue
      }

      const [hash, date, ...msgParts] = line.split('|')
      const message = msgParts.join('|')
      const timestamp = new Date(date).getTime()

      // Next line(s) might be the stat line
      let insertions = 0
      let deletions = 0
      if (i + 1 < lines.length) {
        const statLine = lines[i + 1].trim()
        const insMatch = statLine.match(/(\d+) insertion/)
        const delMatch = statLine.match(/(\d+) deletion/)
        if (insMatch) insertions = parseInt(insMatch[1], 10)
        if (delMatch) deletions = parseInt(delMatch[1], 10)
        if (insMatch || delMatch) i++ // skip stat line
      }

      if (!seenHashes.has(hash)) {
        seenHashes.add(hash)
        allCommits.push({
          hash,
          date,
          timestamp,
          message,
          insertions,
          deletions,
          project: projectName,
        })
      }

      i++
    }
  }

  // Sort by timestamp
  allCommits.sort((a, b) => a.timestamp - b.timestamp)

  // Aggregate per project
  const projectMap = new Map<string, { commits: number; insertions: number; deletions: number }>()
  for (const c of allCommits) {
    const existing = projectMap.get(c.project) ?? { commits: 0, insertions: 0, deletions: 0 }
    projectMap.set(c.project, {
      commits: existing.commits + 1,
      insertions: existing.insertions + c.insertions,
      deletions: existing.deletions + c.deletions,
    })
  }

  // Hour distribution (24 slots)
  const hourDist = new Array(24).fill(0) as number[]
  for (const c of allCommits) {
    const hour = new Date(c.timestamp).getHours()
    hourDist[hour]++
  }

  // Daily commits
  const dailyMap = new Map<string, number>()
  for (const c of allCommits) {
    const day = new Date(c.timestamp).toISOString().slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1)
  }

  const projectStats = [...projectMap.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.commits - a.commits)

  return {
    totalCommits: allCommits.length,
    totalInsertions: allCommits.reduce((s, c) => s + c.insertions, 0),
    totalDeletions: allCommits.reduce((s, c) => s + c.deletions, 0),
    projects: projectStats,
    hourDistribution: hourDist,
    dailyCommits: [...dailyMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    commits: allCommits,
  }
}
